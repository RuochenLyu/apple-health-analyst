import path from "node:path";

import { analyzeActivity } from "../analyzers/activity.js";
import { analyzeBodyComposition } from "../analyzers/bodyComposition.js";
import { analyzeMenstrualCycle } from "../analyzers/menstrualCycle.js";
import { analyzeOverview } from "../analyzers/overview.js";
import { analyzeRecovery } from "../analyzers/recovery.js";
import { analyzeSleep } from "../analyzers/sleep.js";
import { buildInsightBundle } from "../insights/buildInsightBundle.js";
import { findMainXml } from "../io/findMainXml.js";
import { readZip } from "../io/readZip.js";
import { parseHealthExport } from "../io/streamHealthXml.js";
import { buildTimeWindow } from "../normalize/buildTimeWindow.js";
import { selectPrimarySources } from "../normalize/selectPrimarySources.js";
import {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  type AnalysisSummary,
  type InsightBundle,
} from "../types.js";

export interface PrepareOptions {
  from?: string;
  to?: string;
}

export interface PreparedAnalysis {
  summary: AnalysisSummary;
  insights: InsightBundle;
}

function formatLocalDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function prepareAnalysis(
  zipPath: string,
  options: PrepareOptions,
): Promise<PreparedAnalysis> {
  const resolvedZipPath = path.resolve(zipPath);

  const zip = await readZip(resolvedZipPath);
  const mainXmlEntry = await findMainXml(zip.files);
  const parsed = await parseHealthExport(resolvedZipPath, zip.files, mainXmlEntry);
  const timeWindow = buildTimeWindow(
    options.from,
    options.to,
    parsed.exportDate ?? parsed.coverageEnd ?? new Date(),
  );
  const primarySources = selectPrimarySources(parsed, timeWindow);

  const sleepSource = primarySources.sleep?.canonicalName ?? null;
  const sleepRecords = sleepSource
    ? parsed.records.sleep.filter((record) => record.canonicalSource === sleepSource)
    : [];
  const sleep = analyzeSleep(sleepRecords, primarySources.sleep?.displayName ?? null, timeWindow);

  const recovery = analyzeRecovery(
    {
      restingHeartRate: primarySources.recovery.restingHeartRate
        ? parsed.records.restingHeartRate.filter(
            (record) => record.canonicalSource === primarySources.recovery.restingHeartRate?.canonicalName,
          )
        : [],
      hrv: primarySources.recovery.hrv
        ? parsed.records.hrv.filter((record) => record.canonicalSource === primarySources.recovery.hrv?.canonicalName)
        : [],
      oxygenSaturation: primarySources.recovery.oxygenSaturation
        ? parsed.records.oxygenSaturation.filter(
            (record) => record.canonicalSource === primarySources.recovery.oxygenSaturation?.canonicalName,
          )
        : [],
      respiratoryRate: primarySources.recovery.respiratoryRate
        ? parsed.records.respiratoryRate.filter(
            (record) => record.canonicalSource === primarySources.recovery.respiratoryRate?.canonicalName,
          )
        : [],
      vo2Max: primarySources.recovery.vo2Max
        ? parsed.records.vo2Max.filter(
            (record) => record.canonicalSource === primarySources.recovery.vo2Max?.canonicalName,
          )
        : [],
    },
    {
      restingHeartRate: primarySources.recovery.restingHeartRate?.displayName,
      hrv: primarySources.recovery.hrv?.displayName,
      oxygenSaturation: primarySources.recovery.oxygenSaturation?.displayName,
      respiratoryRate: primarySources.recovery.respiratoryRate?.displayName,
      vo2Max: primarySources.recovery.vo2Max?.displayName,
    },
    timeWindow,
  );

  const activity = analyzeActivity(parsed.activitySummaries, parsed.workouts, timeWindow);
  const bodyComposition = analyzeBodyComposition(
    {
      bodyMass: primarySources.bodyComposition.bodyMass
        ? parsed.records.bodyMass.filter(
            (record) => record.canonicalSource === primarySources.bodyComposition.bodyMass?.canonicalName,
          )
        : [],
      bodyFatPercentage: primarySources.bodyComposition.bodyFatPercentage
        ? parsed.records.bodyFatPercentage.filter(
            (record) =>
              record.canonicalSource === primarySources.bodyComposition.bodyFatPercentage?.canonicalName,
          )
        : [],
    },
    {
      bodyMass: primarySources.bodyComposition.bodyMass?.displayName,
      bodyFatPercentage: primarySources.bodyComposition.bodyFatPercentage?.displayName,
    },
    timeWindow,
  );

  const menstrual = analyzeMenstrualCycle(
    parsed.menstrualFlow,
    parsed.intermenstrualBleeding,
    parsed.contraceptive,
    timeWindow,
  );

  const overview = analyzeOverview(parsed, primarySources, timeWindow);
  const summary: AnalysisSummary = {
    metadata: {
      tool: PACKAGE_NAME,
      version: PACKAGE_VERSION,
      generatedAt: new Date().toISOString(),
    },
    input: {
      zipPath: resolvedZipPath,
      mainXmlEntry: parsed.mainXmlEntry,
      from: formatLocalDate(timeWindow.requestedFrom),
      to: formatLocalDate(timeWindow.requestedTo),
      exportDate: parsed.exportDate?.toISOString() ?? null,
      locale: parsed.locale,
    },
    coverage: overview.coverage,
    sources: overview.sources,
    warnings: [
      ...sleep.warnings,
      ...recovery.notes.map((msg) => ({ code: "recovery_note", module: "recovery" as const, message: msg })),
      ...activity.notes.map((msg) => ({ code: "activity_note", module: "activity" as const, message: msg })),
      ...bodyComposition.notes.map((msg) => ({ code: "body_note", module: "bodyComposition" as const, message: msg })),
      ...menstrual.warnings,
    ],
    sleep: sleep.result,
    recovery,
    activity,
    bodyComposition,
    ...(menstrual.result.status !== "insufficient_data" ? { menstrualCycle: menstrual.result } : {}),
    attachments: overview.attachments,
  };

  return {
    summary,
    insights: buildInsightBundle(parsed, primarySources, timeWindow, summary),
  };
}
