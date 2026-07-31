import type { ParsedHealthExport, PrimarySources, TimeWindow } from "../types.js";

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function analyzeOverview(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
) {
  return {
    coverage: {
      recordCount: parsed.recordCount,
      workoutCount: parsed.workoutCount,
      activitySummaryCount: parsed.activitySummaryCount,
      earliestSeen: toIso(parsed.coverageStart),
      latestSeen: toIso(parsed.coverageEnd),
      windowStart: toIso(window.effectiveStart),
      windowEnd: window.effectiveEnd.toISOString(),
      excludedInvalidTimestampSamples:
        parsed.dataQuality?.excludedInvalidTimestampSamples ?? 0,
      excludedImplausibleActivitySummaries:
        parsed.dataQuality?.excludedImplausibleActivitySummaries ?? 0,
      excludedUnsupportedUnitValues:
        parsed.dataQuality?.excludedUnsupportedUnitValues ?? 0,
      deduplicatedWorkoutRecords:
        parsed.dataQuality?.deduplicatedWorkoutRecords ?? 0,
    },
    sources: {
      discovered: parsed.sources,
      primary: {
        sleep: primarySources.sleep?.displayName ?? null,
        recovery: Object.fromEntries(
          Object.entries(primarySources.recovery).map(([metric, source]) => [metric, source?.displayName]),
        ),
        bodyComposition: Object.fromEntries(
          Object.entries(primarySources.bodyComposition).map(([metric, source]) => [
            metric,
            source?.displayName,
          ]),
        ),
        activity: primarySources.activity,
      },
    },
    attachments: parsed.attachments,
  };
}
