import type {
  ParsedHealthExport,
  PrimarySources,
  QuantitySample,
  TimeWindow,
} from "../types.js";

import type { CrossMetricT } from "../i18n/zh/crossMetric.js";

import { buildNightSummaries, roundNumber, averageNumbers } from "./sleepShared.js";

// ── Types ──────────────────────────────────────────────────────────

export interface DailyMetricRow {
  date: string;
  sleepHours: number | null;
  deepPct: number | null;
  remPct: number | null;
  bedtime: string | null;
  wakeTime: string | null;
  restingHR: number | null;
  hrv: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  activeEnergy: number | null;
  exerciseMinutes: number | null;
  standHours: number | null;
  workoutMinutes: number | null;
  bodyMass: number | null;
}

export interface SleepRecoveryLink {
  shortSleepDays: number;
  shortSleepPairedHrvDays: number;
  normalSleepPairedHrvDays: number;
  shortSleepNextDayHRV: number | null;
  normalSleepNextDayHRV: number | null;
  hrvDropOnPoorSleep: number | null;
  shortSleepNextDayRHR: number | null;
  normalSleepNextDayRHR: number | null;
  rhrRiseOnPoorSleep: number | null;
  summary: string;
}

export interface SleepConsistency {
  bedtimeStdMinutes: number | null;
  wakeTimeStdMinutes: number | null;
  durationStdHours: number | null;
  regularity: "high" | "moderate" | "low" | null;
  summary: string;
}

export interface ActivityRecoveryBalance {
  highStrainDays: number;
  highStrainPairedHrvDays: number;
  restDayPairedHrvDays: number;
  highStrainNextDayHRV: number | null;
  restDayNextDayHRV: number | null;
  recoveryAdequate: boolean | null;
  summary: string;
}

export interface RecoveryCoherence {
  rhrTrend: "improving" | "worsening" | "stable" | null;
  hrvTrend: "improving" | "worsening" | "stable" | null;
  aligned: boolean | null;
  summary: string;
}

export interface CompositeAssessment {
  sleepScore: number | null;
  recoveryScore: number | null;
  activityScore: number | null;
  overallReadiness: "good" | "moderate" | "low" | null;
  summary: string;
}

export interface NotableDay {
  date: string;
  metric: string;
  value: number;
  unit: string;
  type: "best" | "worst";
  context: string;
}

export interface CrossMetricAnalysis {
  dailyRows: DailyMetricRow[];
  notableDays: NotableDay[];
  sleepRecoveryLink: SleepRecoveryLink;
  sleepConsistency: SleepConsistency;
  activityRecoveryBalance: ActivityRecoveryBalance;
  recoveryCoherence: RecoveryCoherence;
  compositeAssessment: CompositeAssessment;
  patterns: string[];
}

// ── Helpers ────────────────────────────────────────────────────────

const MIN_ASSOCIATION_SAMPLES_PER_GROUP = 3;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function timeToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function stdDev(values: number[]): number | null {
  if (values.length < 3) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function groupByDate<T>(samples: T[], getDate: (s: T) => Date): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const sample of samples) {
    const key = isoDate(getDate(sample));
    const arr = map.get(key) ?? [];
    arr.push(sample);
    map.set(key, arr);
  }
  return map;
}

function avgSamples(samples: QuantitySample[]): number | null {
  if (samples.length === 0) return null;
  const sum = samples.reduce((a, s) => a + s.value, 0);
  return sum / samples.length;
}

function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay(); // 0=Sun, 6=Sat
}

function isWeekend(dateStr: string): boolean {
  const dow = dayOfWeek(dateStr);
  return dow === 0 || dow === 6;
}

/**
 * Apple Exercise Time commonly overlaps with logged workout duration. Use the
 * larger signal instead of summing both and counting one session twice.
 */
function effectiveExerciseMinutes(row: DailyMetricRow): number | null {
  if (row.exerciseMinutes === null) return row.workoutMinutes;
  if (row.workoutMinutes === null) return row.exerciseMinutes;
  return Math.max(row.exerciseMinutes, row.workoutMinutes);
}

// ── Build daily metric rows ────────────────────────────────────────

function buildDailyRows(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
): DailyMetricRow[] {
  const sleepSource = primarySources.sleep?.canonicalName ?? null;
  const sleepRecords = sleepSource
    ? parsed.records.sleep.filter(
        (r) =>
          r.canonicalSource === sleepSource &&
          (!window.effectiveStart || r.startDate >= window.effectiveStart) &&
          r.startDate <= window.effectiveEnd,
      )
    : [];
  const nights = buildNightSummaries(sleepRecords, window.effectiveEnd)
    .filter((n) => n.totalSleepHours >= 3);

  const nightMap = new Map(nights.map((n) => [n.nightKey, n]));

  function filteredBySource(
    metric: "restingHeartRate" | "hrv" | "oxygenSaturation" | "respiratoryRate" | "vo2Max" | "bodyMass" | "bodyFatPercentage",
    sources: Partial<Record<string, { canonicalName: string } | null>>,
    key: string,
  ): Map<string, QuantitySample[]> {
    const source = (sources as Record<string, { canonicalName: string } | null>)[key];
    if (!source) return new Map();
    const samples = parsed.records[metric].filter(
      (r) =>
        r.canonicalSource === source.canonicalName &&
        (!window.effectiveStart || r.startDate >= window.effectiveStart) &&
        r.startDate <= window.effectiveEnd,
    );
    return groupByDate(samples, (s) => s.startDate);
  }

  const rhrByDay = filteredBySource("restingHeartRate", primarySources.recovery, "restingHeartRate");
  const hrvByDay = filteredBySource("hrv", primarySources.recovery, "hrv");
  const spo2ByDay = filteredBySource("oxygenSaturation", primarySources.recovery, "oxygenSaturation");
  const rrByDay = filteredBySource("respiratoryRate", primarySources.recovery, "respiratoryRate");
  const massByDay = filteredBySource("bodyMass", primarySources.bodyComposition, "bodyMass");

  const activityByDay = new Map(
    parsed.activitySummaries
      .filter((a) => {
        if (window.effectiveStart && a.date < window.effectiveStart) return false;
        return a.date <= window.effectiveEnd;
      })
      .map((a) => [isoDate(a.date), a]),
  );

  const workoutsByDay = groupByDate(
    parsed.workouts.filter((w) => {
      if (window.effectiveStart && w.startDate < window.effectiveStart) return false;
      return w.startDate <= window.effectiveEnd;
    }),
    (w) => w.startDate,
  );

  // Collect all dates
  const allDates = new Set<string>();
  for (const n of nights) allDates.add(n.nightKey);
  for (const key of rhrByDay.keys()) allDates.add(key);
  for (const key of hrvByDay.keys()) allDates.add(key);
  for (const key of activityByDay.keys()) allDates.add(key);
  for (const key of workoutsByDay.keys()) allDates.add(key);

  const recentStart = isoDate(window.recentStart);
  const effectiveEnd = isoDate(window.effectiveEnd);

  const rows: DailyMetricRow[] = [...allDates]
    .filter((d) => d >= recentStart && d <= effectiveEnd)
    .sort()
    .map((date) => {
      const night = nightMap.get(date);
      const totalSleep = night?.totalSleepHours ?? null;
      const deepPct =
        night && totalSleep && totalSleep > 0
          ? roundNumber((night.deepHours / totalSleep) * 100)
          : null;
      const remPct =
        night && totalSleep && totalSleep > 0
          ? roundNumber((night.remHours / totalSleep) * 100)
          : null;
      const bedtime = night
        ? `${String(night.startDate.getUTCHours()).padStart(2, "0")}:${String(night.startDate.getUTCMinutes()).padStart(2, "0")}`
        : null;
      const wakeTime = night
        ? `${String(night.endDate.getUTCHours()).padStart(2, "0")}:${String(night.endDate.getUTCMinutes()).padStart(2, "0")}`
        : null;

      const activity = activityByDay.get(date);
      const workouts = workoutsByDay.get(date) ?? [];
      const workoutMins = workouts.reduce(
        (sum, w) => sum + (w.durationMinutes ?? 0),
        0,
      );

      return {
        date,
        sleepHours: roundNumber(totalSleep),
        deepPct,
        remPct,
        bedtime,
        wakeTime,
        restingHR: roundNumber(avgSamples(rhrByDay.get(date) ?? [])),
        hrv: roundNumber(avgSamples(hrvByDay.get(date) ?? [])),
        spo2: roundNumber(avgSamples(spo2ByDay.get(date) ?? [])),
        respiratoryRate: roundNumber(avgSamples(rrByDay.get(date) ?? [])),
        activeEnergy: activity?.activeEnergyBurned ?? null,
        exerciseMinutes: activity?.appleExerciseTime ?? null,
        standHours: activity?.appleStandHours ?? null,
        workoutMinutes: workoutMins > 0 ? roundNumber(workoutMins) : null,
        bodyMass: roundNumber(avgSamples(massByDay.get(date) ?? [])),
      };
    });

  return rows;
}

// ── Sleep-Recovery Link ────────────────────────────────────────────

function analyzeSleepRecoveryLink(rows: DailyMetricRow[], t: CrossMetricT): SleepRecoveryLink {
  const shortSleepNextHRV: number[] = [];
  const normalSleepNextHRV: number[] = [];
  const shortSleepNextRHR: number[] = [];
  const normalSleepNextRHR: number[] = [];

  const rowMap = new Map(rows.map((r) => [r.date, r]));

  for (const row of rows) {
    if (row.sleepHours === null) continue;
    const nextDayRow = rowMap.get(nextDay(row.date));
    if (!nextDayRow) continue;

    const isShort = row.sleepHours < 6;

    if (nextDayRow.hrv !== null) {
      (isShort ? shortSleepNextHRV : normalSleepNextHRV).push(nextDayRow.hrv);
    }
    if (nextDayRow.restingHR !== null) {
      (isShort ? shortSleepNextRHR : normalSleepNextRHR).push(nextDayRow.restingHR);
    }
  }

  const shortDays = rows.filter((r) => r.sleepHours !== null && r.sleepHours < 6).length;
  const hasEnoughHrvPairs =
    shortSleepNextHRV.length >= MIN_ASSOCIATION_SAMPLES_PER_GROUP &&
    normalSleepNextHRV.length >= MIN_ASSOCIATION_SAMPLES_PER_GROUP;
  const hasEnoughRhrPairs =
    shortSleepNextRHR.length >= MIN_ASSOCIATION_SAMPLES_PER_GROUP &&
    normalSleepNextRHR.length >= MIN_ASSOCIATION_SAMPLES_PER_GROUP;
  const shortHRV = hasEnoughHrvPairs
    ? roundNumber(averageNumbers(shortSleepNextHRV))
    : null;
  const normalHRV = hasEnoughHrvPairs
    ? roundNumber(averageNumbers(normalSleepNextHRV))
    : null;
  const shortRHR = hasEnoughRhrPairs
    ? roundNumber(averageNumbers(shortSleepNextRHR))
    : null;
  const normalRHR = hasEnoughRhrPairs
    ? roundNumber(averageNumbers(normalSleepNextRHR))
    : null;

  const hrvDrop =
    shortHRV !== null && normalHRV !== null && normalHRV > 0
      ? roundNumber(((shortHRV - normalHRV) / normalHRV) * 100)
      : null;
  const rhrRise =
    shortRHR !== null && normalRHR !== null && normalRHR > 0
      ? roundNumber(((shortRHR - normalRHR) / normalRHR) * 100)
      : null;

  let summary: string;
  if (shortDays === 0) {
    summary = t.sleepRecoveryNoShortNights;
  } else if (hrvDrop !== null && hrvDrop < -5) {
    summary = t.sleepRecoveryHrvDrop(shortDays, hrvDrop, shortHRV!, normalHRV!);
  } else if (!hasEnoughHrvPairs) {
    summary = t.sleepRecoveryNoHrvData(
      shortDays,
      shortSleepNextHRV.length,
      normalSleepNextHRV.length,
    );
  } else {
    summary = t.sleepRecoveryTolerable(shortDays);
  }

  return {
    shortSleepDays: shortDays,
    shortSleepPairedHrvDays: shortSleepNextHRV.length,
    normalSleepPairedHrvDays: normalSleepNextHRV.length,
    shortSleepNextDayHRV: shortHRV,
    normalSleepNextDayHRV: normalHRV,
    hrvDropOnPoorSleep: hrvDrop,
    shortSleepNextDayRHR: shortRHR,
    normalSleepNextDayRHR: normalRHR,
    rhrRiseOnPoorSleep: rhrRise,
    summary,
  };
}

// ── Sleep Consistency ──────────────────────────────────────────────

function analyzeSleepConsistency(rows: DailyMetricRow[], t: CrossMetricT): SleepConsistency {
  const bedtimeMinutes: number[] = [];
  const wakeMinutes: number[] = [];
  const durations: number[] = [];

  for (const row of rows) {
    if (row.bedtime) {
      const [h, m] = row.bedtime.split(":").map(Number);
      // Normalize: times before 12:00 are next day (e.g., 01:30 → 25:30)
      bedtimeMinutes.push(h < 12 ? (h + 24) * 60 + m : h * 60 + m);
    }
    if (row.wakeTime) {
      const [h, m] = row.wakeTime.split(":").map(Number);
      wakeMinutes.push(h * 60 + m);
    }
    if (row.sleepHours !== null) {
      durations.push(row.sleepHours);
    }
  }

  const bedStd = roundNumber(stdDev(bedtimeMinutes));
  const wakeStd = roundNumber(stdDev(wakeMinutes));
  const durStd = roundNumber(stdDev(durations));

  let regularity: SleepConsistency["regularity"] = null;
  if (bedStd !== null && wakeStd !== null) {
    const avgStd = (bedStd + wakeStd) / 2;
    if (avgStd <= 30) regularity = "high";
    else if (avgStd <= 60) regularity = "moderate";
    else regularity = "low";
  }

  let summary: string;
  if (regularity === null) {
    summary = t.sleepConsistencyInsufficient;
  } else if (regularity === "high") {
    summary = t.sleepConsistencyHigh(bedStd!, wakeStd!);
  } else if (regularity === "moderate") {
    summary = t.sleepConsistencyModerate(bedStd!, wakeStd!);
  } else {
    summary = t.sleepConsistencyLow(bedStd!, wakeStd!);
  }

  return {
    bedtimeStdMinutes: bedStd,
    wakeTimeStdMinutes: wakeStd,
    durationStdHours: durStd,
    regularity,
    summary,
  };
}

// ── Activity-Recovery Balance ──────────────────────────────────────

function analyzeActivityRecoveryBalance(rows: DailyMetricRow[], t: CrossMetricT): ActivityRecoveryBalance {
  const rowMap = new Map(rows.map((r) => [r.date, r]));

  const highStrainNextHRV: number[] = [];
  const restDayNextHRV: number[] = [];
  let highStrainDays = 0;

  for (const row of rows) {
    const totalExercise = effectiveExerciseMinutes(row) ?? 0;
    const isHighStrain = totalExercise >= 60;
    if (isHighStrain) highStrainDays++;

    const next = rowMap.get(nextDay(row.date));
    if (!next || next.hrv === null) continue;

    if (isHighStrain) {
      highStrainNextHRV.push(next.hrv);
    } else if (totalExercise < 15) {
      restDayNextHRV.push(next.hrv);
    }
  }

  const hasEnoughPairs =
    highStrainNextHRV.length >= MIN_ASSOCIATION_SAMPLES_PER_GROUP &&
    restDayNextHRV.length >= MIN_ASSOCIATION_SAMPLES_PER_GROUP;
  const highHRV = hasEnoughPairs
    ? roundNumber(averageNumbers(highStrainNextHRV))
    : null;
  const restHRV = hasEnoughPairs
    ? roundNumber(averageNumbers(restDayNextHRV))
    : null;
  const adequate =
    highHRV !== null && restHRV !== null
      ? highHRV >= restHRV * 0.85
      : null;

  let summary: string;
  if (highStrainDays === 0) {
    summary = t.activityRecoveryNoHighStrain;
  } else if (adequate === null) {
    summary = t.activityRecoveryInsufficientHrv(highStrainDays);
  } else if (adequate) {
    summary = t.activityRecoveryAdequate(highStrainDays, highHRV!, restHRV!);
  } else {
    summary = t.activityRecoveryInadequate(highStrainDays, highHRV!, restHRV!);
  }

  return {
    highStrainDays,
    highStrainPairedHrvDays: highStrainNextHRV.length,
    restDayPairedHrvDays: restDayNextHRV.length,
    highStrainNextDayHRV: highHRV,
    restDayNextDayHRV: restHRV,
    recoveryAdequate: adequate,
    summary,
  };
}

// ── Recovery Coherence ─────────────────────────────────────────────

function analyzeRecoveryCoherence(rows: DailyMetricRow[], t: CrossMetricT): RecoveryCoherence {
  const rhrValues = rows.filter((r) => r.restingHR !== null).map((r) => r.restingHR!);
  const hrvValues = rows.filter((r) => r.hrv !== null).map((r) => r.hrv!);

  function trend(values: number[]): "improving" | "worsening" | "stable" | null {
    if (values.length < 5) return null;
    const half = Math.floor(values.length / 2);
    const firstHalf = averageNumbers(values.slice(0, half));
    const secondHalf = averageNumbers(values.slice(half));
    if (firstHalf === null || secondHalf === null) return null;
    const change = secondHalf - firstHalf;
    if (Math.abs(change) < 1) return "stable";
    return change > 0 ? "worsening" : "improving"; // For RHR, up = worse
  }

  function hrvTrendFn(values: number[]): "improving" | "worsening" | "stable" | null {
    if (values.length < 5) return null;
    const half = Math.floor(values.length / 2);
    const firstHalf = averageNumbers(values.slice(0, half));
    const secondHalf = averageNumbers(values.slice(half));
    if (firstHalf === null || secondHalf === null) return null;
    const change = secondHalf - firstHalf;
    if (Math.abs(change) < 2) return "stable";
    return change > 0 ? "improving" : "worsening"; // For HRV, up = better
  }

  const rhrT = trend(rhrValues);
  const hrvT = hrvTrendFn(hrvValues);

  // Aligned = both improving or both stable, or one stable + one improving
  const aligned =
    rhrT !== null && hrvT !== null
      ? (rhrT === "improving" && hrvT === "improving") ||
        (rhrT === "stable" && hrvT === "stable") ||
        (rhrT === "stable" && hrvT === "improving") ||
        (rhrT === "improving" && hrvT === "stable")
      : null;

  let summary: string;
  if (rhrT === null || hrvT === null) {
    summary = t.recoveryCoherenceInsufficient;
  } else if (aligned) {
    summary = t.recoveryCoherenceAligned(rhrT, hrvT);
  } else if (rhrT === "worsening" && hrvT === "worsening") {
    summary = t.recoveryCoherenceBothWorsening;
  } else {
    summary = t.recoveryCoherenceMixed(rhrT, hrvT);
  }

  return { rhrTrend: rhrT, hrvTrend: hrvT, aligned, summary };
}

// ── Composite Assessment ───────────────────────────────────────────

function computeCompositeAssessment(
  t: CrossMetricT,
): CompositeAssessment {
  // Keep the legacy shape for consumers, but do not emit arbitrary 0–100 health
  // scores. The previous fixed weights and cut-offs were not clinically
  // validated and created false precision across heterogeneous devices/users.
  return {
    sleepScore: null,
    recoveryScore: null,
    activityScore: null,
    overallReadiness: null,
    summary: t.compositeInsufficientDimensions,
  };
}

// ── Pattern Detection ──────────────────────────────────────────────

function detectPatterns(rows: DailyMetricRow[], t: CrossMetricT): string[] {
  const patterns: string[] = [];

  // Weekend warrior: weekday vs weekend exercise difference
  const weekdayExercise = rows
    .filter((r) => !isWeekend(r.date))
    .map(effectiveExerciseMinutes)
    .filter((value): value is number => value !== null);
  const weekendExercise = rows
    .filter((r) => isWeekend(r.date))
    .map(effectiveExerciseMinutes)
    .filter((value): value is number => value !== null);

  if (weekdayExercise.length >= 5 && weekendExercise.length >= 2) {
    const wdAvg = averageNumbers(weekdayExercise) ?? 0;
    const weAvg = averageNumbers(weekendExercise) ?? 0;
    if (weAvg > wdAvg * 2 && weAvg > 30) {
      patterns.push(
        t.patternWeekendWarrior(Math.round(weAvg), Math.round(wdAvg), Math.round(weAvg / Math.max(wdAvg, 1))),
      );
    }
  }

  // Night owl drift: bedtime trending later
  const bedtimes = rows
    .filter((r) => r.bedtime !== null)
    .map((r) => {
      const [h, m] = r.bedtime!.split(":").map(Number);
      return h < 12 ? (h + 24) * 60 + m : h * 60 + m;
    });

  if (bedtimes.length >= 10) {
    const firstHalf = averageNumbers(bedtimes.slice(0, Math.floor(bedtimes.length / 2))) ?? 0;
    const secondHalf = averageNumbers(bedtimes.slice(Math.floor(bedtimes.length / 2))) ?? 0;
    if (secondHalf - firstHalf > 30) {
      const driftMin = Math.round(secondHalf - firstHalf);
      patterns.push(t.patternNightOwlDrift(driftMin));
    }
  }

  // Sleep debt compensation: weekday short + weekend long
  const weekdaySleep = rows
    .filter((r) => !isWeekend(r.date) && r.sleepHours !== null)
    .map((r) => r.sleepHours!);
  const weekendSleep = rows
    .filter((r) => isWeekend(r.date) && r.sleepHours !== null)
    .map((r) => r.sleepHours!);

  if (weekdaySleep.length >= 5 && weekendSleep.length >= 2) {
    const wdAvg = averageNumbers(weekdaySleep) ?? 0;
    const weAvg = averageNumbers(weekendSleep) ?? 0;
    if (weAvg - wdAvg > 1.5 && wdAvg < 6.5) {
      patterns.push(t.patternSleepDebtCompensation(wdAvg.toFixed(1), weAvg.toFixed(1)));
    }
  }

  // Consecutive high-activity days. Wording stays descriptive because duration
  // alone cannot establish inadequate recovery.
  let consecutiveHighStrain = 0;
  let maxConsecutive = 0;
  for (const row of rows) {
    const total = effectiveExerciseMinutes(row) ?? 0;
    if (total >= 45) {
      consecutiveHighStrain++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveHighStrain);
    } else {
      consecutiveHighStrain = 0;
    }
  }
  if (maxConsecutive >= 4) {
    patterns.push(t.patternRecoveryDeficit(maxConsecutive));
  }

  return patterns;
}

// ── Notable Days ───────────────────────────────────────────────────

function findNotableDays(rows: DailyMetricRow[], t: CrossMetricT): NotableDay[] {
  const days: NotableDay[] = [];

  function findExtreme(
    metric: string,
    unit: string,
    getValue: (r: DailyMetricRow) => number | null,
    bestIs: "high" | "low",
  ) {
    const valid = rows.filter((r) => getValue(r) !== null);
    if (valid.length < 5) return;
    const sorted = [...valid].sort((a, b) => (getValue(a)! - getValue(b)!));
    const best = bestIs === "high" ? sorted[sorted.length - 1] : sorted[0];
    const worst = bestIs === "high" ? sorted[0] : sorted[sorted.length - 1];
    const avg = averageNumbers(valid.map((r) => getValue(r)!));
    if (best && avg !== null) {
      days.push({
        date: best.date,
        metric,
        value: getValue(best)!,
        unit,
        type: "best",
        context: t.notableDayContext(roundNumber(avg)!, unit),
      });
    }
    if (worst && avg !== null && worst.date !== best?.date) {
      days.push({
        date: worst.date,
        metric,
        value: getValue(worst)!,
        unit,
        type: "worst",
        context: t.notableDayContext(roundNumber(avg)!, unit),
      });
    }
  }

  findExtreme(t.notableSleepDuration, t.notableUnitHours, (r) => r.sleepHours, "high");
  findExtreme(t.notableHRV, t.notableUnitMs, (r) => r.hrv, "high");
  findExtreme(t.notableRHR, t.notableUnitBpm, (r) => r.restingHR, "low");
  findExtreme(t.notableExercise, t.notableUnitMinutes, (r) => {
    const minutes = effectiveExerciseMinutes(r);
    return minutes !== null && minutes > 0 ? minutes : null;
  }, "high");

  return days;
}

// ── Main Entry ─────────────────────────────────────────────────────

export function analyzeCrossMetrics(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
  t: CrossMetricT,
): CrossMetricAnalysis {
  const dailyRows = buildDailyRows(parsed, primarySources, window);

  const sleepRecoveryLink = analyzeSleepRecoveryLink(dailyRows, t);
  const sleepConsistency = analyzeSleepConsistency(dailyRows, t);
  const activityRecoveryBalance = analyzeActivityRecoveryBalance(dailyRows, t);
  const recoveryCoherence = analyzeRecoveryCoherence(dailyRows, t);
  const compositeAssessment = computeCompositeAssessment(t);
  const patterns = detectPatterns(dailyRows, t);

  return {
    dailyRows,
    notableDays: findNotableDays(dailyRows, t),
    sleepRecoveryLink,
    sleepConsistency,
    activityRecoveryBalance,
    recoveryCoherence,
    compositeAssessment,
    patterns,
  };
}
