import type { TrainingLoadDaily, TrainingLoadStatus, WorkoutSample } from "../types.js";

import { round } from "./mathUtils.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const ATL_DAYS = 7;
export const CTL_DAYS = 42;
export const ATL_ALPHA = 2 / (ATL_DAYS + 1); // ≈ 0.25
export const CTL_ALPHA = 2 / (CTL_DAYS + 1); // ≈ 0.0465
export const MIN_LOAD_STATUS_DAYS = 28;
export const MIN_LOAD_STATUS_WORKOUTS = 6;

/**
 * Fallback METs per Apple HealthKit workout type, aligned with the
 * Compendium of Physical Activities (2011) moderate-to-vigorous intensity
 * values. Used when `averageMETs` is missing from the HealthKit record.
 */
const FALLBACK_METS: Record<string, number> = {
  HKWorkoutActivityTypeBoxing: 8,
  HKWorkoutActivityTypeCycling: 6.5,
  HKWorkoutActivityTypeHiking: 5,
  HKWorkoutActivityTypeKickboxing: 8,
  HKWorkoutActivityTypeMixedCardio: 6,
  HKWorkoutActivityTypeOther: 4,
  HKWorkoutActivityTypeRowing: 6,
  HKWorkoutActivityTypeRunning: 8.5,
  HKWorkoutActivityTypeStairs: 6,
  HKWorkoutActivityTypeSwimming: 7,
  HKWorkoutActivityTypeTennis: 7,
  HKWorkoutActivityTypeTraditionalStrengthTraining: 5,
  HKWorkoutActivityTypeWalking: 3.5,
};
const DEFAULT_FALLBACK_METS = 4;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Normalize an arbitrary timestamp to the UTC midnight of its day. */
function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, count: number): Date {
  return new Date(date.getTime() + count * DAY_MS);
}

function dayDiff(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

/**
 * Estimate a workout's training load in MET-minutes. Returns `null` when the
 * workout doesn't carry enough information (no duration and no fallback type).
 */
export function estimateWorkoutTLoad(workout: WorkoutSample): number | null {
  if (workout.durationMinutes === null || workout.durationMinutes <= 0) {
    return null;
  }
  const mets =
    workout.averageMETs && workout.averageMETs > 0
      ? workout.averageMETs
      : FALLBACK_METS[workout.workoutActivityType] ?? DEFAULT_FALLBACK_METS;
  return workout.durationMinutes * mets;
}

/**
 * Bucket workout TLoads into daily totals across `[startDate, endDate]`.
 * Days with no workouts stay at 0 so the EWMA has a gap-free input.
 */
export function buildDailyLoadSeries(
  workouts: WorkoutSample[],
  startDate: Date,
  endDate: Date,
): Array<{ date: string; load: number }> {
  const start = toUtcDayStart(startDate);
  const end = toUtcDayStart(endDate);
  if (end < start) {
    return [];
  }
  const byDay = new Map<string, number>();
  for (const workout of workouts) {
    const workoutDay = toUtcDayStart(workout.startDate);
    if (workoutDay < start || workoutDay > end) {
      continue;
    }
    const load = estimateWorkoutTLoad(workout);
    if (load === null) {
      continue;
    }
    const key = isoDay(workoutDay);
    byDay.set(key, (byDay.get(key) ?? 0) + load);
  }

  const totalDays = dayDiff(end, start) + 1;
  const result: Array<{ date: string; load: number }> = [];
  for (let offset = 0; offset < totalDays; offset += 1) {
    const day = addDays(start, offset);
    const key = isoDay(day);
    result.push({ date: key, load: byDay.get(key) ?? 0 });
  }
  return result;
}

/**
 * Iterate an exponentially weighted moving average across a daily series,
 * starting from `seed` (default 0). Returns one EWMA value per day.
 */
export function computeEwma(
  daily: Array<{ load: number }>,
  alpha: number,
  seed = 0,
): number[] {
  const result: number[] = [];
  let prev = seed;
  for (const entry of daily) {
    const next = prev + alpha * (entry.load - prev);
    result.push(next);
    prev = next;
  }
  return result;
}

/**
 * Compute the full CTL/ATL/TSB time series plus a status snapshot.
 * `windowStart` / `windowEnd` define the EWMA warm-up boundary (typically
 * the earliest record date and `effectiveEnd` of the analysis window).
 * `asOfDate` is the day we report as "current" (typically `effectiveEnd`).
 */
export function computeTrainingLoadSeries(
  workouts: WorkoutSample[],
  windowStart: Date,
  windowEnd: Date,
): {
  daily: TrainingLoadDaily[];
  status: TrainingLoadStatus | null;
} {
  const daily = buildDailyLoadSeries(workouts, windowStart, windowEnd);
  if (daily.length === 0) {
    return { daily: [], status: null };
  }

  const atlSeries = computeEwma(daily, ATL_ALPHA);
  const ctlSeries = computeEwma(daily, CTL_ALPHA);

  const dailyWithMetrics: TrainingLoadDaily[] = daily.map((entry, index) => ({
    date: entry.date,
    load: round(entry.load) ?? 0,
    atl: round(atlSeries[index]) ?? 0,
    ctl: round(ctlSeries[index]) ?? 0,
    tsb: round(ctlSeries[index] - atlSeries[index]) ?? 0,
  }));

  const latest = dailyWithMetrics[dailyWithMetrics.length - 1];
  const lookup30d = dailyWithMetrics[dailyWithMetrics.length - 1 - 30];
  const lookup90d = dailyWithMetrics[dailyWithMetrics.length - 1 - 90];

  const ctlDelta30d = lookup30d ? round(latest.ctl - lookup30d.ctl) : null;
  const ctlDelta30dPct =
    lookup30d && lookup30d.ctl > 0 ? round(((latest.ctl - lookup30d.ctl) / lookup30d.ctl) * 100) : null;
  const ctlDelta90dPct =
    lookup90d && lookup90d.ctl > 0 ? round(((latest.ctl - lookup90d.ctl) / lookup90d.ctl) * 100) : null;

  const daysWithAnyLoad = dailyWithMetrics.filter((entry) => entry.load > 0).length;
  const loadBearingWorkoutCount = workouts.filter((workout) => {
    const workoutDay = toUtcDayStart(workout.startDate);
    return (
      workoutDay >= toUtcDayStart(windowStart) &&
      workoutDay <= toUtcDayStart(windowEnd) &&
      estimateWorkoutTLoad(workout) !== null
    );
  }).length;

  // Keep the daily curve available for transparent inspection, but do not
  // publish a "current" load snapshot until there is enough history and
  // enough actual training to make the EWMA comparison meaningful.
  if (
    dailyWithMetrics.length < MIN_LOAD_STATUS_DAYS ||
    loadBearingWorkoutCount < MIN_LOAD_STATUS_WORKOUTS
  ) {
    return { daily: dailyWithMetrics, status: null };
  }

  const status: TrainingLoadStatus = {
    ctl: latest.ctl,
    atl: latest.atl,
    tsb: latest.tsb,
    ctlDelta30d,
    ctlDelta30dPct,
    ctlDelta90dPct,
    asOfDate: latest.date,
    warmupDays: dailyWithMetrics.length,
    activeDays: daysWithAnyLoad,
    atlAlpha: ATL_ALPHA,
    ctlAlpha: CTL_ALPHA,
  };

  return { daily: dailyWithMetrics, status };
}
