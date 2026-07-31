import type { SleepSample } from "../types.js";
import { sourceClockDate } from "../normalize/dateUtils.js";
import { round, average } from "./mathUtils.js";

export { round as roundNumber, average as averageNumbers };

export type NightSummary = {
  nightKey: string;
  anchor: Date;
  totalSleepHours: number;
  awakeHours: number;
  coreHours: number;
  remHours: number;
  deepHours: number;
  unspecifiedHours: number;
  startDate: Date;
  endDate: Date;
};

type Interval = { start: number; end: number };

function unionDurationHours(intervals: Interval[]): number {
  const sorted = intervals
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start);
  if (sorted.length === 0) {
    return 0;
  }

  let totalMs = 0;
  let currentStart = sorted[0].start;
  let currentEnd = sorted[0].end;
  for (const interval of sorted.slice(1)) {
    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
      continue;
    }
    totalMs += currentEnd - currentStart;
    currentStart = interval.start;
    currentEnd = interval.end;
  }
  totalMs += currentEnd - currentStart;
  return totalMs / (60 * 60 * 1000);
}

function medianTime(values: Date[]): string | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values]
    .map((value) => value.getUTCHours() * 60 + value.getUTCMinutes())
    .sort((left, right) => left - right);
  const index = Math.floor(sorted.length / 2);
  const minutes = sorted[index];
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function buildNightSummaries(records: SleepSample[], effectiveEnd: Date): NightSummary[] {
  const buckets = new Map<
    string,
    {
      anchor: Date;
      awake: Interval[];
      core: Interval[];
      rem: Interval[];
      deep: Interval[];
      unspecified: Interval[];
      startDate: Date;
      endDate: Date;
    }
  >();

  for (const record of records) {
    const absoluteEnd = new Date(
      Math.min(record.endDate.getTime(), effectiveEnd.getTime()),
    );
    if (record.startDate > effectiveEnd || absoluteEnd <= record.startDate) {
      continue;
    }
    const localStart = sourceClockDate(
      record.startDate,
      record.startTimezoneOffsetMinutes,
    );
    const localEnd = sourceClockDate(
      absoluteEnd,
      record.endTimezoneOffsetMinutes,
    );
    const anchor = new Date(localStart.getTime() - 12 * 60 * 60 * 1000);
    const nightKey = anchor.toISOString().slice(0, 10);
    const bucket =
      buckets.get(nightKey) ??
      {
        anchor: new Date(`${nightKey}T00:00:00.000Z`),
        awake: [],
        core: [],
        rem: [],
        deep: [],
        unspecified: [],
        startDate: localStart,
        endDate: localEnd,
      };

    if (localStart < bucket.startDate) {
      bucket.startDate = localStart;
    }
    if (localEnd > bucket.endDate) {
      bucket.endDate = localEnd;
    }

    const interval = {
      start: record.startDate.getTime(),
      end: absoluteEnd.getTime(),
    };
    if (/Awake/.test(record.value)) {
      bucket.awake.push(interval);
    } else if (/AsleepCore/.test(record.value)) {
      bucket.core.push(interval);
    } else if (/AsleepREM/.test(record.value)) {
      bucket.rem.push(interval);
    } else if (/AsleepDeep/.test(record.value)) {
      bucket.deep.push(interval);
    } else if (/Asleep/.test(record.value)) {
      bucket.unspecified.push(interval);
    }

    buckets.set(nightKey, bucket);
  }

  return [...buckets.entries()]
    .map(([nightKey, bucket]) => {
      const specificIntervals = [
        ...bucket.core,
        ...bucket.rem,
        ...bucket.deep,
      ];
      const hasSpecificStages = specificIntervals.length > 0;
      const totalSleepHours = unionDurationHours(
        hasSpecificStages ? specificIntervals : bucket.unspecified,
      );
      const rawCoreHours = unionDurationHours(bucket.core);
      const rawRemHours = unionDurationHours(bucket.rem);
      const rawDeepHours = unionDurationHours(bucket.deep);
      const rawSpecificTotal = rawCoreHours + rawRemHours + rawDeepHours;
      const scale =
        rawSpecificTotal > totalSleepHours && rawSpecificTotal > 0
          ? totalSleepHours / rawSpecificTotal
          : 1;

      return {
        nightKey,
        anchor: bucket.anchor,
        totalSleepHours,
        awakeHours: unionDurationHours(bucket.awake),
        coreHours: rawCoreHours * scale,
        remHours: rawRemHours * scale,
        deepHours: rawDeepHours * scale,
        unspecifiedHours: hasSpecificStages
          ? 0
          : unionDurationHours(bucket.unspecified),
        startDate: bucket.startDate,
        endDate: bucket.endDate,
      };
    })
    .sort((left, right) => left.anchor.getTime() - right.anchor.getTime());
}

export function summarizeSleepWindow(nights: NightSummary[]) {
  return {
    nights: nights.length,
    avgSleepHours: round(average(nights.map((night) => night.totalSleepHours))),
    avgAwakeHours: round(average(nights.map((night) => night.awakeHours))),
    medianBedtime: medianTime(nights.map((night) => night.startDate)),
    medianWakeTime: medianTime(nights.map((night) => night.endDate)),
    stagePct: {
      core: round(
        average(
          nights
            .filter((night) => night.totalSleepHours > 0)
            .map((night) => (night.coreHours / night.totalSleepHours) * 100),
        ),
      ),
      rem: round(
        average(
          nights
            .filter((night) => night.totalSleepHours > 0)
            .map((night) => (night.remHours / night.totalSleepHours) * 100),
        ),
      ),
      deep: round(
        average(
          nights
            .filter((night) => night.totalSleepHours > 0)
            .map((night) => (night.deepHours / night.totalSleepHours) * 100),
        ),
      ),
      unspecified: round(
        average(
          nights
            .filter((night) => night.totalSleepHours > 0)
            .map((night) => (night.unspecifiedHours / night.totalSleepHours) * 100),
        ),
      ),
    },
  };
}
