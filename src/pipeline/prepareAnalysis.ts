import path from "node:path";

import { analyzeActivity } from "../analyzers/activity.js";
import { analyzeBodyComposition } from "../analyzers/bodyComposition.js";
import { analyzeMenstrualCycle } from "../analyzers/menstrualCycle.js";
import { analyzeOverview } from "../analyzers/overview.js";
import { analyzeRecovery } from "../analyzers/recovery.js";
import { analyzeSleep } from "../analyzers/sleep.js";
import type { Locale, Translations } from "../i18n/index.js";
import { buildInsightBundle } from "../insights/buildInsightBundle.js";
import { findMainXml } from "../io/findMainXml.js";
import { readZip } from "../io/readZip.js";
import { parseHealthExport } from "../io/streamHealthXml.js";
import { buildTimeWindow, isWithinWindow } from "../normalize/buildTimeWindow.js";
import { deduplicateWorkouts } from "../normalize/deduplicateWorkouts.js";
import { sourceDateKey } from "../normalize/dateUtils.js";
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
  locale?: Locale;
  /**
   * Optional override for the maximum number of primary sports surfaced in
   * the training report. Defaults to 5 when unset.
   */
  topSportCount?: number;
}

export interface PreparedAnalysis {
  summary: AnalysisSummary;
  insights: InsightBundle;
}

function formatDate(date: Date | null, offsetMinutes: number): string | null {
  return date ? sourceDateKey(date, offsetMinutes) : null;
}

export async function prepareAnalysis(
  zipPath: string,
  options: PrepareOptions,
  t: Translations,
): Promise<PreparedAnalysis> {
  const resolvedZipPath = path.resolve(zipPath);

  const zip = await readZip(resolvedZipPath);
  const mainXmlEntry = await findMainXml(zip.files);
  const parsed = await parseHealthExport(resolvedZipPath, zip.files, mainXmlEntry);
  const deduplicated = deduplicateWorkouts(parsed.workouts);
  parsed.workouts = deduplicated.workouts;
  if (parsed.dataQuality) {
    parsed.dataQuality.deduplicatedWorkoutRecords = deduplicated.removedCount;
  }
  const timeWindow = buildTimeWindow(
    options.from,
    options.to,
    parsed.exportDate ?? parsed.coverageEnd ?? new Date(),
    parsed.exportTimezoneOffsetMinutes ?? 0,
  );
  const primarySources = {
    ...selectPrimarySources(parsed, timeWindow),
    activity: t.activity.source,
  };

  const sleepSource = primarySources.sleep?.canonicalName ?? null;
  const sleepRecords = sleepSource
    ? parsed.records.sleep.filter(
        (record) =>
          record.canonicalSource === sleepSource &&
          isWithinWindow(record.startDate, timeWindow),
      )
    : [];
  const sleep = analyzeSleep(sleepRecords, primarySources.sleep?.displayName ?? null, timeWindow, t.sleep);

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
    t.recovery,
  );

  const activity = analyzeActivity(parsed.activitySummaries, parsed.workouts, timeWindow, t.activity);
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
    t.bodyComposition,
  );

  const skipMenstrual = parsed.biologicalSex === "male";
  const menstrual = skipMenstrual
    ? null
    : analyzeMenstrualCycle(
        parsed.menstrualFlow,
        parsed.intermenstrualBleeding,
        parsed.contraceptive,
        timeWindow,
        t.menstrualCycle,
      );

  const overview = analyzeOverview(parsed, primarySources, timeWindow);
  const summary: AnalysisSummary = {
    metadata: {
      tool: PACKAGE_NAME,
      version: PACKAGE_VERSION,
      generatedAt: new Date().toISOString(),
    },
    input: {
      zipPath: path.basename(resolvedZipPath),
      mainXmlEntry: parsed.mainXmlEntry,
      from: formatDate(
        timeWindow.requestedFrom,
        timeWindow.calendarOffsetMinutes ?? 0,
      ),
      to: formatDate(
        timeWindow.requestedTo,
        timeWindow.calendarOffsetMinutes ?? 0,
      ),
      exportDate: parsed.exportDate?.toISOString() ?? null,
      locale: parsed.locale,
    },
    coverage: overview.coverage,
    sources: overview.sources,
    warnings: [
      ...((parsed.dataQuality?.excludedInvalidTimestampSamples ?? 0) +
        (parsed.dataQuality?.excludedImplausibleActivitySummaries ?? 0) >
      0
        ? [
            {
              code: "timestamp_anomaly_excluded",
              module: "overview" as const,
              message: t.common.timestampDataQualityWarning(
                (parsed.dataQuality?.excludedInvalidTimestampSamples ?? 0) +
                  (parsed.dataQuality?.excludedImplausibleActivitySummaries ?? 0),
              ),
            },
          ]
        : []),
      ...((parsed.dataQuality?.excludedUnsupportedUnitValues ?? 0) > 0
        ? [
            {
              code: "unsupported_unit_excluded",
              module: "overview" as const,
              message: t.common.unsupportedUnitWarning(
                parsed.dataQuality?.excludedUnsupportedUnitValues ?? 0,
              ),
            },
          ]
        : []),
      ...((parsed.dataQuality?.deduplicatedWorkoutRecords ?? 0) > 0
        ? [
            {
              code: "duplicate_workout_excluded",
              module: "activity" as const,
              message: t.common.duplicateWorkoutWarning(
                parsed.dataQuality?.deduplicatedWorkoutRecords ?? 0,
              ),
            },
          ]
        : []),
      ...sleep.warnings,
      ...recovery.notes.map((msg) => ({ code: "recovery_note", module: "recovery" as const, message: msg })),
      ...activity.notes.map((msg) => ({ code: "activity_note", module: "activity" as const, message: msg })),
      ...bodyComposition.notes.map((msg) => ({ code: "body_note", module: "bodyComposition" as const, message: msg })),
      ...(menstrual?.warnings ?? []),
    ],
    sleep: sleep.result,
    recovery,
    activity,
    bodyComposition,
    ...(menstrual && menstrual.result.status !== "insufficient_data" ? { menstrualCycle: menstrual.result } : {}),
    attachments: overview.attachments,
  };

  return {
    summary,
    insights: buildInsightBundle(
      parsed,
      primarySources,
      timeWindow,
      summary,
      t.insights,
      t.trainingInsights,
      options.locale ?? "en",
      t.crossMetric,
      { topSportCount: options.topSportCount },
    ),
  };
}
