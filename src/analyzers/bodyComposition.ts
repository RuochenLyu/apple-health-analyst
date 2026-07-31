import type {
  BodyCompositionAnalysis,
  BodyMetricKey,
  NumericComparison,
  QuantitySample,
  TimeWindow,
} from "../types.js";

import type { BodyCompositionT } from "../i18n/zh/bodyComposition.js";

import { round, average } from "./mathUtils.js";
import { isWithinWindow } from "../normalize/buildTimeWindow.js";

function uniqueDays(records: QuantitySample[]): number {
  return new Set(records.map((record) => record.startDate.toISOString().slice(0, 10))).size;
}

function summarizeMetric(
  records: QuantitySample[],
  sourceName: string,
  unit: string,
  window: TimeWindow,
): NumericComparison {
  const recent = records.filter(
    (record) => record.startDate >= window.recentStart && record.startDate <= window.effectiveEnd,
  );
  const baseline = records.filter(
    (record) => record.startDate >= window.baselineStart && record.startDate < window.recentStart,
  );
  const latestRecord = [...records].sort(
    (left, right) => right.startDate.getTime() - left.startDate.getTime(),
  )[0];
  const recentAverage = average(recent.map((record) => record.value));
  const baselineAverage = average(baseline.map((record) => record.value));

  return {
    unit,
    source: sourceName,
    coverageDays: uniqueDays(records),
    sampleCount: records.length,
    recent30d: {
      sampleCount: recent.length,
      average: round(recentAverage),
    },
    baseline90d: {
      sampleCount: baseline.length,
      average: round(baselineAverage),
    },
    delta:
      recentAverage !== null && baselineAverage !== null ? round(recentAverage - baselineAverage) : null,
    latest: latestRecord
      ? {
          timestamp: latestRecord.startDate.toISOString(),
          value: round(latestRecord.value) ?? latestRecord.value,
        }
      : null,
  };
}

export function analyzeBodyComposition(
  recordsByMetric: Partial<Record<BodyMetricKey, QuantitySample[]>>,
  sourceNames: Partial<Record<BodyMetricKey, string>>,
  window: TimeWindow,
  t: BodyCompositionT,
): BodyCompositionAnalysis {
  const units: Record<BodyMetricKey, string> = {
    bodyMass: "kg",
    bodyFatPercentage: "%",
  };

  const metrics = Object.fromEntries(
    (Object.keys(units) as BodyMetricKey[])
      .map((metric) => {
        const sourceName = sourceNames[metric];
        const records = (recordsByMetric[metric] ?? []).filter((record) =>
          isWithinWindow(record.startDate, window),
        );

        if (!sourceName || records.length === 0) {
          return [metric, undefined];
        }

        return [metric, summarizeMetric(records, sourceName, units[metric], window)];
      })
      .filter((entry) => Boolean(entry[1])),
  ) as BodyCompositionAnalysis["metrics"];

  return {
    status: Object.keys(metrics).length > 0 ? "ok" : "insufficient_data",
    sources: Object.fromEntries(
      Object.entries(sourceNames).filter(([, value]) => Boolean(value)),
    ) as BodyCompositionAnalysis["sources"],
    metrics,
    notes:
      Object.keys(metrics).length > 0
        ? [t.activeNote]
        : [t.noDataNote],
  };
}
