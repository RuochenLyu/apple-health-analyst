import type { TrainingInsightsT } from "../i18n/zh/trainingInsights.js";
import type {
  ChartGroup,
  ChartPoint,
  InsightHistoricalContext,
  ParsedHealthExport,
  PrimarySources,
  QuantitySample,
  TimeWindow,
  TrainingInsightBundle,
  TrainingLoadDaily,
  TrainingLoadDelta,
  TrainingLoadStatus,
  TrainingReadiness,
  TrainingRecoveryAfterWorkout,
  TrainingRecoverySupport,
  TrainingSportInsight,
  TrainingState,
  WorkoutSample,
  WorkoutTypeHistoricalContext,
  WorkoutTypeMonthlySummary,
  WorkoutTypeWindowSummary,
} from "../types.js";

import { average, round, subtract } from "./mathUtils.js";
import { buildNightSummaries } from "./sleepShared.js";
import { computeTrainingLoadSeries } from "./trainingLoad.js";
import {
  buildWorkoutTypeHistoricalContext,
  stableWorkoutTypeId,
  summarizeWorkoutWindow,
} from "./workoutTypes.js";

const DAY_MS = 24 * 60 * 60 * 1000;
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function inclusiveDays(start: Date | null, end: Date | null): number {
  if (!start || !end || end < start) {
    return 0;
  }
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

function addDays(date: Date, count: number): Date {
  return new Date(date.getTime() + count * DAY_MS);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange(
  month: string,
  effectiveEnd?: Date,
): { start: string; end: string; label: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
  const end =
    effectiveEnd && monthEnd > effectiveEnd ? effectiveEnd : monthEnd;
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: month,
  };
}

function last12Months(effectiveEnd: Date): string[] {
  const months: string[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const current = new Date(Date.UTC(effectiveEnd.getUTCFullYear(), effectiveEnd.getUTCMonth() - offset, 1));
    months.push(monthKey(current));
  }
  return months;
}

function toPer30(total: number | null, days: number): number | null {
  if (total === null || days <= 0) {
    return null;
  }
  return round((total / days) * 30);
}

function buildPer30Delta(
  recentTotal: number | null,
  recentDays: number,
  comparisonTotal: number | null,
  comparisonDays: number,
): number | null {
  return subtract(toPer30(recentTotal, recentDays), toPer30(comparisonTotal, comparisonDays));
}

function percentChange(current: number | null, baseline: number | null): number | null {
  if (current === null || baseline === null || baseline === 0) {
    return null;
  }
  return round(((current - baseline) / baseline) * 100);
}

function averageByDate(records: QuantitySample[]): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const record of records) {
    const key = isoDate(record.startDate);
    buckets.set(key, [...(buckets.get(key) ?? []), record.value]);
  }
  return new Map(
    [...buckets.entries()].map(([key, values]) => [key, round(average(values)) ?? 0]),
  );
}

function averageByMonth(points: Array<{ date: Date; value: number | null }>, months: string[]): Map<string, number | null> {
  const buckets = new Map<string, number[]>();
  for (const point of points) {
    if (point.value === null) {
      continue;
    }
    const key = monthKey(point.date);
    if (!months.includes(key)) {
      continue;
    }
    buckets.set(key, [...(buckets.get(key) ?? []), point.value]);
  }
  return new Map(months.map((month) => [month, round(average(buckets.get(month) ?? []))]));
}

function sumByMonth(points: Array<{ date: Date; value: number | null }>, months: string[]): Map<string, number | null> {
  const buckets = new Map<string, number[]>();
  for (const point of points) {
    if (point.value === null) {
      continue;
    }
    const key = monthKey(point.date);
    if (!months.includes(key)) {
      continue;
    }
    buckets.set(key, [...(buckets.get(key) ?? []), point.value]);
  }
  return new Map(
    months.map((month) => {
      const values = buckets.get(month) ?? [];
      return [month, values.length > 0 ? round(values.reduce((sum, value) => sum + value, 0)) : null];
    }),
  );
}

function averageIndex(points: Map<string, number | null>): number | null {
  const values = [...points.values()].filter((value): value is number => value !== null);
  return round(average(values));
}

function indexSeries(
  id: string,
  label: string,
  data: Map<string, number | null>,
  invert = false,
  effectiveEnd?: Date,
): ChartPoint[] {
  const baseline = averageIndex(data);
  return [...data.entries()].map(([month, value]) => {
    const range = monthRange(month, effectiveEnd);
    let indexedValue: number | null = null;
    if (value !== null && baseline !== null && baseline !== 0) {
      indexedValue = invert ? round((baseline / value) * 100) : round((value / baseline) * 100);
    }
    return {
      start: range.start,
      end: range.end,
      granularity: "month" as const,
      label: range.label,
      value: indexedValue,
      sampleCount: value === null ? 0 : 1,
    };
  });
}

const WORKOUT_ICON_BY_TYPE: Record<string, string> = {
  HKWorkoutActivityTypeAmericanFootball: "football",
  HKWorkoutActivityTypeArchery: "archery",
  HKWorkoutActivityTypeAustralianFootball: "football",
  HKWorkoutActivityTypeBadminton: "badminton",
  HKWorkoutActivityTypeBaseball: "baseball",
  HKWorkoutActivityTypeBasketball: "basketball",
  HKWorkoutActivityTypeBarre: "mind-body",
  HKWorkoutActivityTypeBowling: "bowling",
  HKWorkoutActivityTypeBoxing: "boxing",
  HKWorkoutActivityTypeCardioDance: "dance",
  HKWorkoutActivityTypeClimbing: "climbing",
  HKWorkoutActivityTypeCooldown: "recovery",
  HKWorkoutActivityTypeCoreTraining: "strength",
  HKWorkoutActivityTypeCricket: "cricket",
  HKWorkoutActivityTypeCrossCountrySkiing: "skiing",
  HKWorkoutActivityTypeCrossTraining: "cardio",
  HKWorkoutActivityTypeCycling: "cycling",
  HKWorkoutActivityTypeDance: "dance",
  HKWorkoutActivityTypeDiscSports: "disc",
  HKWorkoutActivityTypeDownhillSkiing: "skiing",
  HKWorkoutActivityTypeElliptical: "cardio",
  HKWorkoutActivityTypeEquestrianSports: "equestrian",
  HKWorkoutActivityTypeFencing: "martial-arts",
  HKWorkoutActivityTypeFishing: "outdoor",
  HKWorkoutActivityTypeFitnessGaming: "cardio",
  HKWorkoutActivityTypeFlexibility: "mind-body",
  HKWorkoutActivityTypeFunctionalStrengthTraining: "strength",
  HKWorkoutActivityTypeGolf: "golf",
  HKWorkoutActivityTypeGymnastics: "gymnastics",
  HKWorkoutActivityTypeHandball: "handball",
  HKWorkoutActivityTypeHiking: "hiking",
  HKWorkoutActivityTypeHighIntensityIntervalTraining: "hiit",
  HKWorkoutActivityTypeHockey: "hockey",
  HKWorkoutActivityTypeHunting: "outdoor",
  HKWorkoutActivityTypeJumpRope: "jump-rope",
  HKWorkoutActivityTypeKickboxing: "boxing",
  HKWorkoutActivityTypeLacrosse: "lacrosse",
  HKWorkoutActivityTypeMartialArts: "martial-arts",
  HKWorkoutActivityTypeMindAndBody: "mind-body",
  HKWorkoutActivityTypeMixedCardio: "cardio",
  HKWorkoutActivityTypeOther: "generic",
  HKWorkoutActivityTypePaddleSports: "rowing",
  HKWorkoutActivityTypePickleball: "tennis",
  HKWorkoutActivityTypePilates: "mind-body",
  HKWorkoutActivityTypePlay: "cardio",
  HKWorkoutActivityTypePreparationAndRecovery: "recovery",
  HKWorkoutActivityTypeRacquetball: "tennis",
  HKWorkoutActivityTypeRowing: "rowing",
  HKWorkoutActivityTypeRugby: "football",
  HKWorkoutActivityTypeRunning: "running",
  HKWorkoutActivityTypeSailing: "sailing",
  HKWorkoutActivityTypeSkatingSports: "skating",
  HKWorkoutActivityTypeSnowSports: "skiing",
  HKWorkoutActivityTypeSoccer: "soccer",
  HKWorkoutActivityTypeSocialDance: "dance",
  HKWorkoutActivityTypeSoftball: "baseball",
  HKWorkoutActivityTypeStairClimbing: "stairs",
  HKWorkoutActivityTypeStairs: "stairs",
  HKWorkoutActivityTypeSurfingSports: "surfing",
  HKWorkoutActivityTypeSwimming: "swimming",
  HKWorkoutActivityTypeTableTennis: "table-tennis",
  HKWorkoutActivityTypeTaiChi: "mind-body",
  HKWorkoutActivityTypeTennis: "tennis",
  HKWorkoutActivityTypeTrackAndField: "running",
  HKWorkoutActivityTypeTraditionalStrengthTraining: "strength",
  HKWorkoutActivityTypeVolleyball: "volleyball",
  HKWorkoutActivityTypeWalking: "walking",
  HKWorkoutActivityTypeWaterFitness: "swimming",
  HKWorkoutActivityTypeWaterPolo: "water-polo",
  HKWorkoutActivityTypeWaterSports: "swimming",
  HKWorkoutActivityTypeWheelchairRunPace: "running",
  HKWorkoutActivityTypeWheelchairWalkPace: "walking",
  HKWorkoutActivityTypeWrestling: "wrestling",
  HKWorkoutActivityTypeYoga: "mind-body",
};

const WORKOUT_ICON_RULES: Array<{ pattern: RegExp; icon: string }> = [
  { pattern: /(Run|TrackAndField)/i, icon: "running" },
  { pattern: /Walk/i, icon: "walking" },
  { pattern: /Cycl/i, icon: "cycling" },
  { pattern: /(Swim|Water)/i, icon: "swimming" },
  { pattern: /(Row|Paddle)/i, icon: "rowing" },
  { pattern: /(Box|Kickbox)/i, icon: "boxing" },
  { pattern: /(Martial|Wrestl|Fencing)/i, icon: "martial-arts" },
  { pattern: /(Strength|Core)/i, icon: "strength" },
  { pattern: /(HIIT|Cardio|Elliptical|FitnessGaming)/i, icon: "cardio" },
  { pattern: /(Yoga|Pilates|TaiChi|MindAndBody|Flexibility|Barre)/i, icon: "mind-body" },
  { pattern: /Dance/i, icon: "dance" },
  { pattern: /(Tennis|Pickleball|Racquet|Squash)/i, icon: "tennis" },
  { pattern: /Badminton/i, icon: "badminton" },
  { pattern: /TableTennis/i, icon: "table-tennis" },
  { pattern: /Soccer/i, icon: "soccer" },
  { pattern: /Basketball/i, icon: "basketball" },
  { pattern: /(Baseball|Softball)/i, icon: "baseball" },
  { pattern: /(Football|Rugby)/i, icon: "football" },
  { pattern: /Volleyball/i, icon: "volleyball" },
  { pattern: /Cricket/i, icon: "cricket" },
  { pattern: /Golf/i, icon: "golf" },
  { pattern: /Disc/i, icon: "disc" },
  { pattern: /Hike/i, icon: "hiking" },
  { pattern: /(Ski|Snow)/i, icon: "skiing" },
  { pattern: /Skat/i, icon: "skating" },
  { pattern: /Surf/i, icon: "surfing" },
  { pattern: /Sail/i, icon: "sailing" },
  { pattern: /Climb/i, icon: "climbing" },
  { pattern: /Lacrosse/i, icon: "lacrosse" },
  { pattern: /Handball/i, icon: "handball" },
  { pattern: /Hockey/i, icon: "hockey" },
  { pattern: /(Gymnastics|JumpRope)/i, icon: "gymnastics" },
  { pattern: /Archery/i, icon: "archery" },
  { pattern: /Bowling/i, icon: "bowling" },
  { pattern: /Equestrian/i, icon: "equestrian" },
  { pattern: /(Fishing|Hunting)/i, icon: "outdoor" },
  { pattern: /(Cooldown|Recovery)/i, icon: "recovery" },
];

export function iconForWorkoutType(type: string): string {
  const exact = WORKOUT_ICON_BY_TYPE[type];
  if (exact) {
    return exact;
  }

  const normalized = type.replace(/^HKWorkoutActivityType/, "");
  for (const rule of WORKOUT_ICON_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.icon;
    }
  }

  return "generic";
}

function sportId(type: string): string {
  return stableWorkoutTypeId(type);
}

function sumRecentMonths(
  recentMonths: WorkoutTypeMonthlySummary[],
): { workouts: number; totalDurationMinutes: number; activeMonthsLast12: number } {
  return recentMonths.reduce(
    (summary, month) => ({
      workouts: summary.workouts + month.workouts,
      totalDurationMinutes: summary.totalDurationMinutes + (month.totalDurationMinutes ?? 0),
      activeMonthsLast12: summary.activeMonthsLast12 + (month.workouts > 0 ? 1 : 0),
    }),
    { workouts: 0, totalDurationMinutes: 0, activeMonthsLast12: 0 },
  );
}

function buildTrainingLoadDelta(
  recent: WorkoutTypeWindowSummary,
  comparison: WorkoutTypeWindowSummary,
  recentDays: number,
  comparisonDays: number,
): TrainingLoadDelta {
  return {
    workoutsPer30d: buildPer30Delta(recent.workouts, recentDays, comparison.workouts, comparisonDays),
    durationMinutesPer30d: buildPer30Delta(
      recent.totalDurationMinutes,
      recentDays,
      comparison.totalDurationMinutes,
      comparisonDays,
    ),
    activeEnergyBurnedKcalPer30d: buildPer30Delta(
      recent.totalActiveEnergyBurnedKcal,
      recentDays,
      comparison.totalActiveEnergyBurnedKcal,
      comparisonDays,
    ),
    distanceKmPer30d: buildPer30Delta(
      recent.totalDistanceKm,
      recentDays,
      comparison.totalDistanceKm,
      comparisonDays,
    ),
  };
}

function buildSleepByDay(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
): Map<string, number> {
  const source = primarySources.sleep?.canonicalName;
  if (!source) {
    return new Map();
  }
  const records = parsed.records.sleep.filter(
    (record) =>
      record.canonicalSource === source &&
      (window.effectiveStart ? record.startDate >= window.effectiveStart : true) &&
      record.startDate <= window.effectiveEnd,
  );
  const nights = buildNightSummaries(records, window.effectiveEnd).filter((night) => night.totalSleepHours >= 3);
  return new Map(nights.map((night) => [night.nightKey, round(night.totalSleepHours) ?? night.totalSleepHours]));
}

function longestGapDays(workouts: WorkoutSample[]): number | null {
  if (workouts.length < 2) {
    return null;
  }
  const sorted = [...workouts].sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  let maxGap = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const gap = Math.round((sorted[index].startDate.getTime() - sorted[index - 1].startDate.getTime()) / DAY_MS);
    maxGap = Math.max(maxGap, gap);
  }
  return maxGap;
}

function frequencyTrend(recentMonths: WorkoutTypeMonthlySummary[]): "denser" | "stable" | "sparser" | null {
  if (recentMonths.length < 12) {
    return null;
  }
  const first = recentMonths.slice(0, 6).reduce((sum, month) => sum + month.workouts, 0);
  const second = recentMonths.slice(6).reduce((sum, month) => sum + month.workouts, 0);
  if (first === 0 && second === 0) {
    return null;
  }
  if (first === 0 && second > 0) {
    return "denser";
  }
  if (first > 0 && second === 0) {
    return "sparser";
  }
  if (second >= first * 1.15) {
    return "denser";
  }
  if (second <= first * 0.85) {
    return "sparser";
  }
  return "stable";
}

function buildRecoveryAfterWorkout(
  workouts: WorkoutSample[],
  sleepByDay: Map<string, number>,
  hrvByDay: Map<string, number>,
  restingHeartRateByDay: Map<string, number>,
  comparisonWindowStart: Date,
  comparisonWindowEnd: Date,
): TrainingRecoveryAfterWorkout {
  const nextDays = [...new Set(workouts.map((workout) => isoDate(addDays(workout.startDate, 1))))];
  const nextDaySet = new Set(nextDays);
  const windowStart = isoDate(comparisonWindowStart);
  const windowEnd = isoDate(comparisonWindowEnd);

  function compareMetric(valuesByDay: Map<string, number>): {
    nextDayCount: number;
    comparatorCount: number;
    delta: number | null;
  } {
    const nextDayValues: number[] = [];
    const comparatorValues: number[] = [];
    for (const [date, value] of valuesByDay) {
      if (date < windowStart || date > windowEnd) {
        continue;
      }
      if (nextDaySet.has(date)) {
        nextDayValues.push(value);
      } else {
        comparatorValues.push(value);
      }
    }
    return {
      nextDayCount: nextDayValues.length,
      comparatorCount: comparatorValues.length,
      delta: subtract(average(nextDayValues), average(comparatorValues)),
    };
  }

  const sleep = compareMetric(sleepByDay);
  const hrv = compareMetric(hrvByDay);
  const restingHeartRate = compareMetric(restingHeartRateByDay);
  const sampleCount = Math.max(
    sleep.nextDayCount,
    hrv.nextDayCount,
    restingHeartRate.nextDayCount,
  );
  return {
    sampleCount,
    sleepSampleCount: sleep.nextDayCount,
    hrvSampleCount: hrv.nextDayCount,
    restingHeartRateSampleCount: restingHeartRate.nextDayCount,
    sleepComparatorSampleCount: sleep.comparatorCount,
    hrvComparatorSampleCount: hrv.comparatorCount,
    restingHeartRateComparatorSampleCount: restingHeartRate.comparatorCount,
    comparator: "other_observed_days",
    comparisonWindowStart: windowStart,
    comparisonWindowEnd: windowEnd,
    nextDaySleepHoursDelta: sleep.delta,
    nextDayHrvDelta: hrv.delta,
    nextDayRestingHeartRateDelta: restingHeartRate.delta,
  };
}

function buildStatusTags(
  loadDeltaPct: number | null,
  recoveryAfterWorkout: TrainingRecoveryAfterWorkout,
  recentMonths: WorkoutTypeMonthlySummary[],
  consistencyWorkouts: WorkoutSample[],
): TrainingSportInsight["statusTags"] {
  const loadTag =
    loadDeltaPct !== null && loadDeltaPct >= 10 ? "load rising"
    : loadDeltaPct !== null && loadDeltaPct <= -10 ? "load falling"
    : "load stable";

  const measuredRecoverySignals = [
    recoveryAfterWorkout.nextDaySleepHoursDelta === null ||
    recoveryAfterWorkout.sleepSampleCount < 5 ||
    recoveryAfterWorkout.sleepComparatorSampleCount < 5
      ? null
      : recoveryAfterWorkout.nextDaySleepHoursDelta >= -0.25,
    recoveryAfterWorkout.nextDayHrvDelta === null ||
    recoveryAfterWorkout.hrvSampleCount < 5 ||
    recoveryAfterWorkout.hrvComparatorSampleCount < 5
      ? null
      : recoveryAfterWorkout.nextDayHrvDelta >= -5,
    recoveryAfterWorkout.nextDayRestingHeartRateDelta === null ||
    recoveryAfterWorkout.restingHeartRateSampleCount < 5 ||
    recoveryAfterWorkout.restingHeartRateComparatorSampleCount < 5
      ? null
      : recoveryAfterWorkout.nextDayRestingHeartRateDelta <= 2,
  ].filter((signal): signal is boolean => signal !== null);

  const recoveryConcernCount = measuredRecoverySignals.filter(
    (signal) => !signal,
  ).length;
  const recoveryTag =
    measuredRecoverySignals.length < 2
      ? "recovery unknown"
      : recoveryConcernCount === 0
        ? "recovery supported"
        : recoveryConcernCount >= 2
          ? "recovery concern"
          : "recovery mixed";

  const recentSixMonths = recentMonths.slice(6);
  const activeMonths = recentSixMonths.filter((month) => month.workouts > 0).length;
  const consistencyTag =
    activeMonths >= 4 &&
      (longestGapDays(consistencyWorkouts) ?? Number.POSITIVE_INFINITY) <= 45 &&
      frequencyTrend(recentMonths) !== "sparser"
      ? "consistency good"
      : "consistency uneven";

  return [loadTag, recoveryTag, consistencyTag];
}

/**
 * Decide the training state from scale-independent load changes, with recovery
 * evidence taking priority. The load series is based on MET-minutes, so
 * absolute CTL/ATL/TSB cut-offs from TSS-based systems are not transferable.
 * In particular, a large negative load balance alone must never be labelled
 * "strained".
 */
function buildTrainingState(
  trainingLoad: TrainingLoadStatus | null,
  recoverySupport: TrainingRecoverySupport,
): TrainingState {
  if (!trainingLoad) {
    return "insufficient_data";
  }

  const { ctlDelta30dPct, ctlDelta90dPct } = trainingLoad;
  const weakRecoverySignalCount = [
    recoverySupport.sleepDeltaHours !== null && recoverySupport.sleepDeltaHours <= -0.5,
    recoverySupport.hrvDeltaPct !== null && recoverySupport.hrvDeltaPct <= -10,
    recoverySupport.restingHeartRateDeltaBpm !== null &&
      recoverySupport.restingHeartRateDeltaBpm >= 3,
  ].filter(Boolean).length;
  const recoveryConcern =
    recoverySupport.adequate === false || weakRecoverySignalCount >= 2;

  // Long- and short-horizon decline must agree before calling this detraining.
  if (
    ctlDelta90dPct !== null &&
    ctlDelta90dPct <= -25 &&
    ctlDelta30dPct !== null &&
    ctlDelta30dPct <= -5
  ) {
    return "detraining";
  }

  // "Strained" needs both a material relative load increase and independent
  // recovery concern. A MET-minute balance value by itself is not evidence of
  // poor recovery.
  if (
    ctlDelta30dPct !== null &&
    ctlDelta30dPct >= 15 &&
    recoveryConcern
  ) {
    return "strained";
  }

  if (ctlDelta30dPct !== null && ctlDelta30dPct >= 5) {
    return "building";
  }

  if (ctlDelta30dPct !== null && ctlDelta30dPct <= -10) {
    return "recovering";
  }

  if (ctlDelta30dPct !== null && Math.abs(ctlDelta30dPct) < 5) {
    return "maintaining";
  }

  return "mixed";
}

function buildReadiness(trainingState: TrainingState, recoverySupport: TrainingRecoverySupport): TrainingReadiness {
  if (trainingState === "insufficient_data") {
    return "insufficient_data";
  }
  const availableSignalCount = [
    recoverySupport.sleepDeltaHours,
    recoverySupport.hrvDeltaPct,
    recoverySupport.restingHeartRateDeltaBpm,
    recoverySupport.adequate,
  ].filter((value) => value !== null).length;
  if (availableSignalCount === 0) {
    return "insufficient_data";
  }
  const weakSignalCount = [
    recoverySupport.sleepDeltaHours !== null && recoverySupport.sleepDeltaHours <= -0.5,
    recoverySupport.hrvDeltaPct !== null && recoverySupport.hrvDeltaPct <= -10,
    recoverySupport.restingHeartRateDeltaBpm !== null && recoverySupport.restingHeartRateDeltaBpm >= 3,
  ].filter(Boolean).length;

  if (trainingState === "strained" || weakSignalCount >= 2) {
    return "low";
  }
  if (
    trainingState === "mixed" ||
    weakSignalCount === 1 ||
    recoverySupport.adequate !== true
  ) {
    return "moderate";
  }
  return "good";
}

function buildMonthlyLineSeries(
  id: string,
  label: string,
  unit: string,
  monthly: WorkoutTypeMonthlySummary[],
  valueSelector: (month: WorkoutTypeMonthlySummary) => number | null,
): ChartPoint[] {
  return monthly.map((month) => {
    const range = monthRange(month.month);
    return {
      start: range.start,
      end: range.end,
      granularity: "month" as const,
      label: range.label,
      value: valueSelector(month),
      sampleCount: month.workouts,
    };
  });
}

/**
 * Down-sample the daily CTL/ATL/TSB series into weekly representative points
 * for the PMC hero chart. We slice to the last ~52 weeks from `endDate` so
 * the visual always shows a 12-month window regardless of total history.
 */
function weeklyPmcPoints(
  daily: TrainingLoadDaily[],
  endDate: Date,
  weeks = 52,
): Array<{
  label: string;
  start: string;
  end: string;
  ctl: number;
  atl: number;
  tsb: number;
}> {
  if (daily.length === 0) return [];
  // Group daily entries by ISO week (Mon-start, UTC). We key by the Monday
  // date of that week so we can sort chronologically.
  const byWeek = new Map<string, TrainingLoadDaily[]>();
  for (const entry of daily) {
    // Parse the date as UTC midnight and snap to that week's Monday.
    const [year, month, day] = entry.date.split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(d.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
    const key = monday.toISOString().slice(0, 10);
    byWeek.set(key, [...(byWeek.get(key) ?? []), entry]);
  }
  const sortedWeeks = [...byWeek.entries()].sort(([left], [right]) => (left < right ? -1 : 1));
  // Take the last `weeks` weeks.
  const sliced = sortedWeeks.slice(Math.max(0, sortedWeeks.length - weeks));
  const effectiveEndKey = isoDate(endDate);
  return sliced.map(([mondayKey, entries]) => {
    // Representative value = the last daily sample in that week (chronological).
    const last = entries[entries.length - 1];
    const sunday = new Date(new Date(`${mondayKey}T00:00:00Z`).getTime() + 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return {
      label: mondayKey,
      start: mondayKey,
      end: sunday > effectiveEndKey ? effectiveEndKey : sunday,
      ctl: last.ctl,
      atl: last.atl,
      tsb: last.tsb,
    };
  });
}

/**
 * Build the hero training-load chart (PMC style: CTL line + ATL line + TSB
 * area, 52 weekly points). Keeps the legacy `training_load` chart id so
 * downstream narrative JSON stays valid.
 */
function buildTrainingLoadChart(
  daily: TrainingLoadDaily[],
  effectiveEnd: Date,
  t: TrainingInsightsT,
): ChartGroup {
  const weekly = weeklyPmcPoints(daily, effectiveEnd, 52);
  const makePoints = (selector: (w: (typeof weekly)[number]) => number): ChartPoint[] =>
    weekly.map((w) => ({
      start: w.start,
      end: w.end,
      granularity: "week" as const,
      label: w.label,
      value: round(selector(w)),
      sampleCount: 1,
    }));
  return {
    id: "training_load",
    title: t.trainingLoadChartTitle,
    subtitle: t.trainingLoadChartSubtitle,
    series: [
      {
        id: "training_load_ctl",
        label: t.ctlSeriesLabel,
        unit: t.chartUnitMetMinutes,
        visual: "line",
        points: makePoints((w) => w.ctl),
      },
      {
        id: "training_load_atl",
        label: t.atlSeriesLabel,
        unit: t.chartUnitMetMinutes,
        visual: "line",
        points: makePoints((w) => w.atl),
      },
      {
        id: "training_load_tsb",
        label: t.tsbSeriesLabel,
        unit: t.chartUnitMetMinutes,
        visual: "area",
        points: makePoints((w) => w.tsb),
      },
    ],
  };
}

function trainingSportInsight(
  context: WorkoutTypeHistoricalContext,
  workouts: WorkoutSample[],
  window: TimeWindow,
  sleepByDay: Map<string, number>,
  hrvByDay: Map<string, number>,
  restingHeartRateByDay: Map<string, number>,
): TrainingSportInsight {
  const trailing180dStart = addDays(window.effectiveEnd, -179);
  const trailing365dStart = addDays(window.effectiveEnd, -364);
  const baselineWindowStart =
    window.effectiveStart && window.effectiveStart > window.baselineStart ? window.effectiveStart : window.baselineStart;
  const baselineWindowEnd = addDays(window.recentStart, -1);
  const recentDays = inclusiveDays(window.recentStart, window.effectiveEnd);
  const baselineDays = inclusiveDays(baselineWindowStart, baselineWindowEnd);
  const recoveryWorkouts = workouts.filter(
    (workout) => workout.startDate >= trailing180dStart && workout.startDate <= window.effectiveEnd,
  );
  const recoveryAfterWorkout = buildRecoveryAfterWorkout(
    recoveryWorkouts,
    sleepByDay,
    hrvByDay,
    restingHeartRateByDay,
    trailing180dStart,
    window.effectiveEnd,
  );
  const consistencyWorkouts = workouts.filter(
    (workout) => workout.startDate >= trailing365dStart && workout.startDate <= window.effectiveEnd,
  );
  const loadDeltaPct =
    percentChange(
      toPer30(context.recent30d.totalDurationMinutes, recentDays),
      toPer30(context.baseline90d.totalDurationMinutes, baselineDays),
    ) ??
    percentChange(
      toPer30(context.recent30d.workouts, recentDays),
      toPer30(context.baseline90d.workouts, baselineDays),
    );

  return {
    id: sportId(context.type),
    type: context.type,
    label: context.label,
    icon: iconForWorkoutType(context.type),
    recent30d: context.recent30d,
    baseline90d: context.baseline90d,
    trailing180d: context.trailing180d,
    trailing365d: context.trailing365d,
    allTime: context.allTime,
    normalizedDeltas: {
      recentVsBaseline90d: buildTrainingLoadDelta(
        context.recent30d,
        context.baseline90d,
        inclusiveDays(window.recentStart, window.effectiveEnd),
        inclusiveDays(baselineWindowStart, baselineWindowEnd),
      ),
      recentVsTrailing180d: buildTrainingLoadDelta(
        context.recent30d,
        context.trailing180d,
        inclusiveDays(window.recentStart, window.effectiveEnd),
        inclusiveDays(trailing180dStart, window.effectiveEnd),
      ),
      recentVsAllTime: buildTrainingLoadDelta(
        context.recent30d,
        context.allTime,
        inclusiveDays(window.recentStart, window.effectiveEnd),
        inclusiveDays(window.effectiveStart ?? workouts[0]?.startDate ?? null, window.effectiveEnd),
      ),
    },
    recoveryAfterWorkout,
    consistency: {
      recentMonths: context.recentMonths,
      longestGapDays: longestGapDays(consistencyWorkouts),
      frequencyTrend: frequencyTrend(context.recentMonths),
      activeMonthsLast12: context.recentMonths.filter((month) => month.workouts > 0).length,
    },
    statusTags: buildStatusTags(
      loadDeltaPct,
      recoveryAfterWorkout,
      context.recentMonths,
      consistencyWorkouts,
    ),
  };
}

export interface TrainingInsightsOptions {
  /** Maximum number of primary sports to include in the report. Defaults to 5. */
  topSportCount?: number;
}

export function buildTrainingInsights(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
  historicalContext: InsightHistoricalContext,
  recoveryAdequate: boolean | null,
  t: TrainingInsightsT,
  options: TrainingInsightsOptions = {},
): TrainingInsightBundle {
  const topSportCount = Math.max(1, Math.min(options.topSportCount ?? 5, 8));
  const workoutContexts = buildWorkoutTypeHistoricalContext(
    parsed.workouts,
    window,
    t.metadataLanguage === "zh-CN" ? "zh" : "en",
  );
  const workoutsByType = new Map<string, WorkoutSample[]>();
  for (const workout of parsed.workouts) {
    const withinWindow = !(window.effectiveStart && workout.startDate < window.effectiveStart) && workout.startDate <= window.effectiveEnd;
    if (!withinWindow) {
      continue;
    }
    workoutsByType.set(workout.workoutActivityType, [...(workoutsByType.get(workout.workoutActivityType) ?? []), workout]);
  }

  const sleepByDay = buildSleepByDay(parsed, primarySources, window);
  // Clip HRV and resting-HR day-level maps to the same analysis window as
  // the rest of the training report. Otherwise `buildRecoveryAfterWorkout`
  // and the monthly recovery-index chart could incorporate samples that lie
  // outside the user's requested `--from`/`--to` range, making the training
  // report disagree with every other window-bounded section.
  const withinWindow = (record: QuantitySample): boolean =>
    (window.effectiveStart ? record.startDate >= window.effectiveStart : true) &&
    record.startDate <= window.effectiveEnd;
  const hrvByDay = primarySources.recovery.hrv
    ? averageByDate(
        parsed.records.hrv.filter(
          (record) =>
            record.canonicalSource === primarySources.recovery.hrv?.canonicalName &&
            withinWindow(record),
        ),
      )
    : new Map<string, number>();
  const restingHeartRateByDay = primarySources.recovery.restingHeartRate
    ? averageByDate(
        parsed.records.restingHeartRate.filter(
          (record) =>
            record.canonicalSource === primarySources.recovery.restingHeartRate?.canonicalName &&
            withinWindow(record),
        ),
      )
    : new Map<string, number>();

  /**
   * Selection score: recent activity weighs more than deep history but we
   * still reward long-term continuity so a sport that just came back after a
   * short break can re-enter the report.
   *
   *   score = 2 × trailing180d_minutes
   *         + 1 × (trailing365d - trailing180d)_minutes
   *         + activeMonthsLast12 × 20   (continuity bonus)
   *         + min(allTime_minutes, 10_000) × 0.05  (deep-history bonus, capped)
   */
  function selectionScore(context: WorkoutTypeHistoricalContext): number {
    const last12 = sumRecentMonths(context.recentMonths);
    const trailing180 = context.trailing180d.totalDurationMinutes ?? 0;
    const trailing365 = context.trailing365d.totalDurationMinutes ?? 0;
    const trailing180_365 = Math.max(0, trailing365 - trailing180);
    const allTime = Math.min(context.allTime.totalDurationMinutes ?? 0, 10_000);
    return (
      trailing180 * 2 +
      trailing180_365 +
      last12.activeMonthsLast12 * 20 +
      allTime * 0.05
    );
  }

  const selectedContexts = workoutContexts
    .filter((context) => {
      const last12Months = sumRecentMonths(context.recentMonths);
      // Hard dormancy filter: even if the sport had years of history, skip it
      // if the athlete hasn't touched it in ~6 months and barely in a year.
      // This prevents stale sports (e.g. a cycling season from two years ago)
      // from occupying the top-sports list.
      if (context.trailing180d.workouts === 0 && context.trailing365d.workouts < 3) {
        return false;
      }
      // Require at least some recent signal in one of several windows so that
      // sports with very sparse logs don't get included just because of an
      // all-time bulk count.
      return (
        context.recent30d.workouts >= 2 ||
        context.trailing180d.workouts >= 2 ||
        last12Months.workouts >= 4 ||
        last12Months.activeMonthsLast12 >= 2
      );
    })
    .sort((left, right) => selectionScore(right) - selectionScore(left))
    .slice(0, topSportCount);

  const sportInsights = selectedContexts.map((context) =>
    trainingSportInsight(
      context,
      workoutsByType.get(context.type) ?? [],
      window,
      sleepByDay,
      hrvByDay,
      restingHeartRateByDay,
    ),
  );

  const filteredWorkouts = [...workoutsByType.values()].flat();
  const recentStart = window.recentStart;
  const baselineStart =
    window.effectiveStart && window.effectiveStart > window.baselineStart ? window.effectiveStart : window.baselineStart;
  const baselineEnd = addDays(window.recentStart, -1);
  const recentWorkouts = filteredWorkouts.filter(
    (workout) => workout.startDate >= recentStart && workout.startDate <= window.effectiveEnd,
  );
  const baselineWorkouts = filteredWorkouts.filter(
    (workout) => workout.startDate >= baselineStart && workout.startDate <= baselineEnd,
  );

  const recentSummary = summarizeWorkoutWindow(recentWorkouts);
  const baselineSummary = summarizeWorkoutWindow(baselineWorkouts);
  const recentDays = inclusiveDays(recentStart, window.effectiveEnd);
  const baselineDays = inclusiveDays(baselineStart, baselineEnd);
  const loadTrend = {
    recent30dEquivWorkouts: toPer30(recentSummary.workouts, recentDays),
    baseline90dEquivWorkouts: toPer30(baselineSummary.workouts, baselineDays),
    recent30dEquivDurationMinutes: toPer30(recentSummary.totalDurationMinutes, recentDays),
    baseline90dEquivDurationMinutes: toPer30(baselineSummary.totalDurationMinutes, baselineDays),
    recent30dEquivActiveEnergyBurnedKcal: toPer30(recentSummary.totalActiveEnergyBurnedKcal, recentDays),
    baseline90dEquivActiveEnergyBurnedKcal: toPer30(baselineSummary.totalActiveEnergyBurnedKcal, baselineDays),
    recentVsBaseline90d: buildTrainingLoadDelta(recentSummary, baselineSummary, recentDays, baselineDays),
    recentWorkoutVariety: new Set(recentWorkouts.map((workout) => workout.workoutActivityType)).size,
    baselineWorkoutVariety: new Set(baselineWorkouts.map((workout) => workout.workoutActivityType)).size,
    recentVsBaselineVariety:
      new Set(recentWorkouts.map((workout) => workout.workoutActivityType)).size -
      new Set(baselineWorkouts.map((workout) => workout.workoutActivityType)).size,
  };

  const recoverySupport: TrainingRecoverySupport = {
    sleepDeltaHours: historicalContext.sleep.recentVsBaseline90d.sleepHours,
    hrvDeltaPct: percentChange(
      historicalContext.recovery.hrv?.recent30d.average ?? null,
      historicalContext.recovery.hrv?.baseline90d.average ?? null,
    ),
    restingHeartRateDeltaBpm: subtract(
      historicalContext.recovery.restingHeartRate?.recent30d.average ?? null,
      historicalContext.recovery.restingHeartRate?.baseline90d.average ?? null,
    ),
    adequate: recoveryAdequate,
  };

  // Training load EWMA — ATL / CTL / TSB.
  // The EWMA warm-up ideally starts from the earliest workout so the first 42 days
  // of the reporting window inherit a realistic CTL seed.
  const earliestWorkoutDate =
    filteredWorkouts.length > 0
      ? filteredWorkouts.reduce(
          (earliest, workout) => (workout.startDate < earliest ? workout.startDate : earliest),
          filteredWorkouts[0].startDate,
        )
      : null;
  const loadSeriesStart =
    earliestWorkoutDate && (!window.effectiveStart || earliestWorkoutDate < window.effectiveStart)
      ? earliestWorkoutDate
      : (window.effectiveStart ?? earliestWorkoutDate ?? window.effectiveEnd);
  const { daily: trainingLoadDaily, status: trainingLoadStatus } = computeTrainingLoadSeries(
    filteredWorkouts,
    loadSeriesStart,
    window.effectiveEnd,
  );

  const trainingState = buildTrainingState(
    trainingLoadStatus,
    recoverySupport,
  );
  const readiness = buildReadiness(trainingState, recoverySupport);

  const months = last12Months(window.effectiveEnd);
  const loadChart: ChartGroup = buildTrainingLoadChart(
    trainingLoadDaily,
    window.effectiveEnd,
    t,
  );

  const overallWorkoutMinutesByMonth = sumByMonth(
    filteredWorkouts.map((workout) => ({ date: workout.startDate, value: workout.durationMinutes })),
    months,
  );
  const sleepByMonth = averageByMonth(
    [...sleepByDay.entries()].map(([date, value]) => ({ date: new Date(`${date}T12:00:00Z`), value })),
    months,
  );
  const hrvByMonth = averageByMonth(
    [...hrvByDay.entries()].map(([date, value]) => ({ date: new Date(`${date}T12:00:00Z`), value })),
    months,
  );
  const rhrByMonth = averageByMonth(
    [...restingHeartRateByDay.entries()].map(([date, value]) => ({ date: new Date(`${date}T12:00:00Z`), value })),
    months,
  );

  const trainingRecoveryChart: ChartGroup = {
    id: "training_recovery",
    title: t.trainingRecoveryChartTitle,
    subtitle: t.trainingRecoveryChartSubtitle,
    series: [
      {
        id: "training_load_index",
        label: t.trainingLoadIndexLabel,
        unit: t.chartUnitIndex,
        visual: "line",
        points: indexSeries(
          "training_load_index",
          t.trainingLoadIndexLabel,
          overallWorkoutMinutesByMonth,
          false,
          window.effectiveEnd,
        ),
      },
      {
        id: "sleep_index",
        label: t.sleepSupportIndexLabel,
        unit: t.chartUnitIndex,
        visual: "line",
        points: indexSeries(
          "sleep_index",
          t.sleepSupportIndexLabel,
          sleepByMonth,
          false,
          window.effectiveEnd,
        ),
      },
      {
        id: "hrv_index",
        label: t.hrvSupportIndexLabel,
        unit: t.chartUnitIndex,
        visual: "line",
        points: indexSeries(
          "hrv_index",
          t.hrvSupportIndexLabel,
          hrvByMonth,
          false,
          window.effectiveEnd,
        ),
      },
      {
        id: "rhr_index",
        label: t.restingHeartRateSupportIndexLabel,
        unit: t.chartUnitIndex,
        visual: "line",
        points: indexSeries(
          "rhr_index",
          t.restingHeartRateSupportIndexLabel,
          rhrByMonth,
          true,
          window.effectiveEnd,
        ),
      },
    ],
  };

  const sportCharts: ChartGroup[] = sportInsights.map((sport) => ({
    id: `sport_${sport.id}_trend`,
    title: t.sportTrendChartTitle(sport.label),
    subtitle: t.sportTrendChartSubtitle,
    series: [
      {
        id: `${sport.id}_sessions`,
        label: t.workoutCountLabel,
        unit: t.chartUnitSessions,
        visual: "bar",
        points: sport.consistency.recentMonths.map((month) => {
          const range = monthRange(month.month, window.effectiveEnd);
          return {
            start: range.start,
            end: range.end,
            granularity: "month" as const,
            label: range.label,
            value: month.workouts,
            sampleCount: month.workouts,
          };
        }),
      },
      {
        id: `${sport.id}_avg_duration`,
        label: t.avgWorkoutDurationLabel,
        unit: t.chartUnitMinutes,
        visual: "line",
        points: sport.consistency.recentMonths.map((month) => {
          const range = monthRange(month.month, window.effectiveEnd);
          return {
            start: range.start,
            end: range.end,
            granularity: "month" as const,
            label: range.label,
            value: month.averageDurationMinutes,
            sampleCount: month.workouts,
          };
        }),
      },
    ],
  }));

  return {
    summary: {
      trainingState,
      readiness,
      primarySportLabel: sportInsights[0]?.label ?? null,
      recent30dWorkouts: recentSummary.workouts,
      recent30dDurationMinutes: recentSummary.totalDurationMinutes,
      recent30dActiveEnergyBurnedKcal: recentSummary.totalActiveEnergyBurnedKcal,
      loadTrend,
      recoverySupport,
      trainingLoad: trainingLoadStatus,
    },
    sports: sportInsights,
    charts: [loadChart, trainingRecoveryChart, ...sportCharts],
    dailyLoad: trainingLoadDaily.slice(-365),
    narrativeContext: {
      audience: t.narrativeAudience,
      goal: t.narrativeGoal,
      language: t.metadataLanguage,
      outputSchemaVersion: t.outputSchemaVersion,
      boundaries: t.narrativeBoundaries,
    },
  };
}
