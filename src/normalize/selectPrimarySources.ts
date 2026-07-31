import type {
  BodyMetricKey,
  ParsedHealthExport,
  PrimarySources,
  RecoveryMetricKey,
  SelectedSource,
  SleepSample,
  TimeWindow,
} from "../types.js";

import { looksWearableSource } from "./canonicalizeSource.js";
import { isWithinWindow } from "./buildTimeWindow.js";
import { sourceClockDate, toUtcDateKey } from "./dateUtils.js";

function isRecent(date: Date, window: TimeWindow): boolean {
  return isWithinWindow(date, window) && date >= window.recentStart;
}

function rankSources<T extends { canonicalSource: string; sourceName: string; startDate: Date }>(
  samples: T[],
  window: TimeWindow,
  preferWearables = false,
): SelectedSource[] {
  const buckets = new Map<
    string,
    {
      displayName: string;
      rawNames: Set<string>;
      recentSampleCount: number;
      totalSampleCount: number;
      windowSampleCount: number;
      recentDays: Set<string>;
      windowDays: Set<string>;
      latestWindowTimestamp: number;
    }
  >();

  for (const sample of samples) {
    const bucket =
      buckets.get(sample.canonicalSource) ??
      {
        displayName: sample.sourceName,
        rawNames: new Set<string>(),
        recentSampleCount: 0,
        totalSampleCount: 0,
        windowSampleCount: 0,
        recentDays: new Set<string>(),
        windowDays: new Set<string>(),
        latestWindowTimestamp: Number.NEGATIVE_INFINITY,
      };

    bucket.rawNames.add(sample.sourceName);
    bucket.totalSampleCount += 1;
    if (isWithinWindow(sample.startDate, window)) {
      bucket.windowSampleCount += 1;
      bucket.windowDays.add(toUtcDateKey(sample.startDate));
      bucket.latestWindowTimestamp = Math.max(
        bucket.latestWindowTimestamp,
        sample.startDate.getTime(),
      );
    }
    if (isRecent(sample.startDate, window)) {
      bucket.recentSampleCount += 1;
      bucket.recentDays.add(toUtcDateKey(sample.startDate));
    }
    buckets.set(sample.canonicalSource, bucket);
  }

  const ranked = [...buckets.entries()]
    .filter(([, bucket]) => bucket.windowSampleCount > 0)
    .map(([canonicalName, bucket]) => ({
      canonicalName,
      displayName: bucket.displayName,
      rawNames: [...bucket.rawNames].sort(),
      recentSampleCount: bucket.recentSampleCount,
      totalSampleCount: bucket.totalSampleCount,
      windowSampleCount: bucket.windowSampleCount,
      windowCoverageDays: bucket.windowDays.size,
      recentCoverageDays: bucket.recentDays.size,
      latestWindowTimestamp: bucket.latestWindowTimestamp,
      wearable: preferWearables && looksWearableSource(bucket.displayName),
    }))
    .sort((left, right) => {
      if (right.recentCoverageDays !== left.recentCoverageDays) {
        return right.recentCoverageDays - left.recentCoverageDays;
      }
      if (right.windowCoverageDays !== left.windowCoverageDays) {
        return right.windowCoverageDays - left.windowCoverageDays;
      }
      if (right.recentSampleCount !== left.recentSampleCount) {
        return right.recentSampleCount - left.recentSampleCount;
      }
      if (right.windowSampleCount !== left.windowSampleCount) {
        return right.windowSampleCount - left.windowSampleCount;
      }
      if (Number(right.wearable) !== Number(left.wearable)) {
        return Number(right.wearable) - Number(left.wearable);
      }
      if (right.latestWindowTimestamp !== left.latestWindowTimestamp) {
        return right.latestWindowTimestamp - left.latestWindowTimestamp;
      }
      return left.displayName.localeCompare(right.displayName);
    });

  return ranked.map(
    ({
      recentCoverageDays: _recentCoverageDays,
      latestWindowTimestamp: _latestWindowTimestamp,
      wearable: _wearable,
      ...source
    }): SelectedSource => source,
  );
}

function selectSleepSource(records: SleepSample[], window: TimeWindow): PrimarySources["sleep"] {
  const buckets = new Map<
    string,
    {
      displayName: string;
      rawNames: Set<string>;
      totalSampleCount: number;
      recentSampleCount: number;
      recentNightKeys: Set<string>;
      windowSampleCount: number;
      windowNightKeys: Set<string>;
      latestWindowTimestamp: number;
      staged: boolean;
    }
  >();

  for (const record of records) {
    const bucket =
      buckets.get(record.canonicalSource) ??
      {
        displayName: record.sourceName,
        rawNames: new Set<string>(),
        totalSampleCount: 0,
        recentSampleCount: 0,
        recentNightKeys: new Set<string>(),
        windowSampleCount: 0,
        windowNightKeys: new Set<string>(),
        latestWindowTimestamp: Number.NEGATIVE_INFINITY,
        staged: false,
      };

    const staged = /Asleep(Core|REM|Deep)|Awake/.test(record.value);
    const localStart = sourceClockDate(
      record.startDate,
      record.startTimezoneOffsetMinutes,
    );
    const nightKey = new Date(localStart.getTime() - 12 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    bucket.rawNames.add(record.sourceName);
    bucket.totalSampleCount += 1;
    if (isWithinWindow(record.startDate, window)) {
      bucket.windowSampleCount += 1;
      bucket.windowNightKeys.add(nightKey);
      bucket.latestWindowTimestamp = Math.max(
        bucket.latestWindowTimestamp,
        record.startDate.getTime(),
      );
      bucket.staged ||= staged;
    }
    if (isRecent(record.startDate, window)) {
      bucket.recentSampleCount += 1;
      bucket.recentNightKeys.add(nightKey);
    }
    buckets.set(record.canonicalSource, bucket);
  }

  const ranked = [...buckets.entries()]
    .filter(([, bucket]) => bucket.windowSampleCount > 0)
    .map(([canonicalName, bucket]) => ({
      canonicalName,
      displayName: bucket.displayName,
      rawNames: [...bucket.rawNames].sort(),
      recentSampleCount: bucket.recentSampleCount,
      totalSampleCount: bucket.totalSampleCount,
      windowSampleCount: bucket.windowSampleCount,
      windowCoverageDays: bucket.windowNightKeys.size,
      staged: bucket.staged,
      recentNightCount: bucket.recentNightKeys.size,
      windowNightCount: bucket.windowNightKeys.size,
      latestWindowTimestamp: bucket.latestWindowTimestamp,
    }))
    .sort((left, right) => {
      if (right.recentNightCount !== left.recentNightCount) {
        return right.recentNightCount - left.recentNightCount;
      }
      if (right.windowNightCount !== left.windowNightCount) {
        return right.windowNightCount - left.windowNightCount;
      }
      if (right.recentSampleCount !== left.recentSampleCount) {
        return right.recentSampleCount - left.recentSampleCount;
      }
      if (right.windowSampleCount !== left.windowSampleCount) {
        return right.windowSampleCount - left.windowSampleCount;
      }
      if (Number(right.staged) !== Number(left.staged)) {
        return Number(right.staged) - Number(left.staged);
      }
      if (right.latestWindowTimestamp !== left.latestWindowTimestamp) {
        return right.latestWindowTimestamp - left.latestWindowTimestamp;
      }
      return left.displayName.localeCompare(right.displayName);
    });

  const selected = ranked[0];
  if (!selected) {
    return null;
  }
  const { latestWindowTimestamp: _latestWindowTimestamp, ...source } = selected;
  return source;
}

function firstOrNull<T>(values: T[]): T | undefined {
  return values[0];
}

export function selectPrimarySources(parsed: ParsedHealthExport, window: TimeWindow): PrimarySources {
  const recoveryMetrics: RecoveryMetricKey[] = [
    "restingHeartRate",
    "hrv",
    "oxygenSaturation",
    "respiratoryRate",
    "vo2Max",
  ];
  const bodyMetrics: BodyMetricKey[] = ["bodyMass", "bodyFatPercentage"];
  const globalDisplayNames = new Map(
    parsed.sources.map((source) => [source.canonicalName, source.displayName]),
  );
  const withGlobalDisplayName = <
    T extends { canonicalName: string; displayName: string } | null | undefined,
  >(
    source: T,
  ): T => {
    if (!source) {
      return source;
    }
    return {
      ...source,
      displayName:
        globalDisplayNames.get(source.canonicalName) ?? source.displayName,
    } as T;
  };

  return {
    sleep: withGlobalDisplayName(
      selectSleepSource(parsed.records.sleep, window),
    ),
    recovery: Object.fromEntries(
      recoveryMetrics
        .map((metric) => [
          metric,
          withGlobalDisplayName(
            firstOrNull(
              rankSources(parsed.records[metric], window, true),
            ),
          ),
        ])
        .filter((entry) => Boolean(entry[1])),
    ) as PrimarySources["recovery"],
    bodyComposition: Object.fromEntries(
      bodyMetrics
        .map((metric) => [
          metric,
          withGlobalDisplayName(
            firstOrNull(rankSources(parsed.records[metric], window)),
          ),
        ])
        .filter((entry) => Boolean(entry[1])),
    ) as PrimarySources["bodyComposition"],
    activity: "活动摘要 + 训练记录",
  };
}
