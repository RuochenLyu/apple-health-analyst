import type { ChartGranularity, ChartPoint } from "../types.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_SPAN_DAYS = 90;
const WEEKLY_SPAN_DAYS = 2 * 365;

type AggregateMode = "average" | "sum" | "latest";

interface TimedValue {
  timestamp: Date;
  value: number | null;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(new Date(date.getTime() + diff * DAY_MS));
}

function endOfWeek(date: Date): Date {
  return endOfDay(new Date(startOfWeek(date).getTime() + 6 * DAY_MS));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

function round(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

export function selectGranularity(
  earliestDate: Date,
  anchorEnd: Date,
): ChartGranularity {
  const spanDays =
    Math.max(
      0,
      Math.floor(
        (startOfDay(anchorEnd).getTime() - startOfDay(earliestDate).getTime()) /
          DAY_MS,
      ),
    ) + 1;
  if (spanDays <= DAILY_SPAN_DAYS) {
    return "day";
  }
  if (spanDays <= WEEKLY_SPAN_DAYS) {
    return "week";
  }
  return "month";
}

function bucketWindow(
  date: Date,
  granularity: ChartGranularity,
  anchorEnd: Date,
): { start: Date; end: Date } {
  let start: Date;
  let end: Date;

  if (granularity === "day") {
    start = startOfDay(date);
    end = endOfDay(start);
  } else if (granularity === "week") {
    start = startOfWeek(date);
    end = endOfWeek(date);
  } else {
    start = startOfMonth(date);
    end = endOfMonth(date);
  }

  if (end > anchorEnd) {
    end = anchorEnd;
  }
  return { start, end };
}

function formatDatePart(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function labelForBucket(start: Date, end: Date, granularity: ChartGranularity): string {
  if (granularity === "day") {
    return formatDatePart(start);
  }
  if (granularity === "week") {
    return `${formatDatePart(start)} ~ ${formatDatePart(end)}`;
  }
  return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function compressTimeSeries(
  values: TimedValue[],
  anchorEnd: Date,
  aggregate: AggregateMode,
): ChartPoint[] {
  const buckets = new Map<
    string,
    {
      start: Date;
      end: Date;
      granularity: ChartGranularity;
      values: number[];
      latestValue: number | null;
    }
  >();

  const earliestTimestamp = values.reduce<Date | null>(
    (earliest, entry) =>
      earliest === null || entry.timestamp < earliest
        ? entry.timestamp
        : earliest,
    null,
  );
  const granularity = earliestTimestamp
    ? selectGranularity(earliestTimestamp, anchorEnd)
    : "day";

  for (const entry of values) {
    const { start, end } = bucketWindow(entry.timestamp, granularity, anchorEnd);
    const key = `${granularity}:${start.toISOString()}`;
    const bucket =
      buckets.get(key) ??
      {
        start,
        end,
        granularity,
        values: [],
        latestValue: null,
      };

    if (entry.value !== null) {
      bucket.values.push(entry.value);
      bucket.latestValue = entry.value;
    }

    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .sort((left, right) => left.start.getTime() - right.start.getTime())
    .map((bucket) => {
      let value: number | null = null;
      if (aggregate === "latest") {
        value = bucket.latestValue;
      } else if (bucket.values.length > 0) {
        const sum = bucket.values.reduce((accumulator, current) => accumulator + current, 0);
        value = aggregate === "sum" ? sum : sum / bucket.values.length;
      }

      return {
        start: bucket.start.toISOString(),
        end: bucket.end.toISOString(),
        granularity: bucket.granularity,
        label: labelForBucket(bucket.start, bucket.end, bucket.granularity),
        value: round(value),
        sampleCount: bucket.values.length,
      };
    });
}
