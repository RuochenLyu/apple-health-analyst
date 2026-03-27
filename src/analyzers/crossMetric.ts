import type {
  ActivitySummarySample,
  ParsedHealthExport,
  PrimarySources,
  QuantitySample,
  TimeWindow,
} from "../types.js";

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

export interface CrossMetricAnalysis {
  dailyRows: DailyMetricRow[];
  sleepRecoveryLink: SleepRecoveryLink;
  sleepConsistency: SleepConsistency;
  activityRecoveryBalance: ActivityRecoveryBalance;
  recoveryCoherence: RecoveryCoherence;
  compositeAssessment: CompositeAssessment;
  patterns: string[];
}

// ── Helpers ────────────────────────────────────────────────────────

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function linearScore(value: number, low: number, high: number): number {
  if (high === low) return 50;
  return clamp(((value - low) / (high - low)) * 100, 0, 100);
}

function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay(); // 0=Sun, 6=Sat
}

function isWeekend(dateStr: string): boolean {
  const dow = dayOfWeek(dateStr);
  return dow === 0 || dow === 6;
}

// ── Build daily metric rows ────────────────────────────────────────

function buildDailyRows(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
): DailyMetricRow[] {
  const sleepSource = primarySources.sleep?.canonicalName ?? null;
  const sleepRecords = sleepSource
    ? parsed.records.sleep.filter((r) => r.canonicalSource === sleepSource)
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
    const samples = parsed.records[metric].filter((r) => r.canonicalSource === source.canonicalName);
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

  const rows: DailyMetricRow[] = [...allDates]
    .filter((d) => d >= recentStart)
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
        ? `${String(night.startDate.getHours()).padStart(2, "0")}:${String(night.startDate.getMinutes()).padStart(2, "0")}`
        : null;
      const wakeTime = night
        ? `${String(night.endDate.getHours()).padStart(2, "0")}:${String(night.endDate.getMinutes()).padStart(2, "0")}`
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

function analyzeSleepRecoveryLink(rows: DailyMetricRow[]): SleepRecoveryLink {
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
  const shortHRV = roundNumber(averageNumbers(shortSleepNextHRV));
  const normalHRV = roundNumber(averageNumbers(normalSleepNextHRV));
  const shortRHR = roundNumber(averageNumbers(shortSleepNextRHR));
  const normalRHR = roundNumber(averageNumbers(normalSleepNextRHR));

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
    summary = "近期没有睡眠不足 6 小时的夜晚，睡眠时长保障较好。";
  } else if (hrvDrop !== null && hrvDrop < -5) {
    summary = `睡眠不足 6 小时的 ${shortDays} 个夜晚，次日 HRV 平均下降 ${Math.abs(hrvDrop)}%（${shortHRV} vs ${normalHRV} ms），说明短睡对自主神经恢复有明确影响。`;
  } else if (shortDays >= 3 && hrvDrop === null) {
    summary = `有 ${shortDays} 个夜晚睡眠不足 6 小时，但缺少足够的次日 HRV 数据来判断恢复影响。`;
  } else {
    summary = `有 ${shortDays} 个夜晚睡眠不足 6 小时，次日 HRV 未出现显著下降，身体对短睡的耐受尚可。`;
  }

  return {
    shortSleepDays: shortDays,
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

function analyzeSleepConsistency(rows: DailyMetricRow[]): SleepConsistency {
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
    summary = "作息规律性数据不足，无法评估。";
  } else if (regularity === "high") {
    summary = `入睡时间标准差约 ${bedStd} 分钟，起床标准差约 ${wakeStd} 分钟，作息节律非常稳定。研究表明规律作息比延长睡眠时间对健康的贡献更大。`;
  } else if (regularity === "moderate") {
    summary = `入睡时间标准差约 ${bedStd} 分钟，起床标准差约 ${wakeStd} 分钟，作息有一定波动。建议优先固定起床时间，入睡时间会自然趋于稳定。`;
  } else {
    summary = `入睡时间标准差约 ${bedStd} 分钟，起床标准差约 ${wakeStd} 分钟，作息波动较大。不规律的作息会削弱昼夜节律，影响深睡质量和激素分泌。`;
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

function analyzeActivityRecoveryBalance(rows: DailyMetricRow[]): ActivityRecoveryBalance {
  const rowMap = new Map(rows.map((r) => [r.date, r]));

  const highStrainNextHRV: number[] = [];
  const restDayNextHRV: number[] = [];
  let highStrainDays = 0;

  for (const row of rows) {
    const totalExercise = (row.exerciseMinutes ?? 0) + (row.workoutMinutes ?? 0);
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

  const highHRV = roundNumber(averageNumbers(highStrainNextHRV));
  const restHRV = roundNumber(averageNumbers(restDayNextHRV));
  const adequate =
    highHRV !== null && restHRV !== null
      ? highHRV >= restHRV * 0.85
      : null;

  let summary: string;
  if (highStrainDays === 0) {
    summary = "近期没有高运动量天（≥60 分钟），无法评估训练-恢复平衡。";
  } else if (adequate === null) {
    summary = `有 ${highStrainDays} 天运动量较高，但 HRV 数据不足以判断恢复充分性。`;
  } else if (adequate) {
    summary = `有 ${highStrainDays} 天高运动量，次日 HRV 均值 ${highHRV} ms 接近休息日的 ${restHRV} ms，说明身体对当前训练负荷恢复良好。`;
  } else {
    summary = `有 ${highStrainDays} 天高运动量，次日 HRV 均值 ${highHRV} ms 明显低于休息日的 ${restHRV} ms，提示训练负荷可能超出恢复能力，建议适当降低强度或增加恢复日。`;
  }

  return {
    highStrainDays,
    highStrainNextDayHRV: highHRV,
    restDayNextDayHRV: restHRV,
    recoveryAdequate: adequate,
    summary,
  };
}

// ── Recovery Coherence ─────────────────────────────────────────────

function analyzeRecoveryCoherence(rows: DailyMetricRow[]): RecoveryCoherence {
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
    summary = "恢复指标数据不足，无法判断趋势一致性。";
  } else if (aligned) {
    summary = `静息心率${rhrT === "improving" ? "下降" : "稳定"}，HRV ${hrvT === "improving" ? "上升" : "稳定"}，两项恢复指标方向一致，交感/副交感平衡状态良好。`;
  } else if (rhrT === "worsening" && hrvT === "worsening") {
    summary = "静息心率上升且 HRV 下降，双重信号提示自主神经恢复能力下降，需要关注压力、睡眠和训练负荷。";
  } else {
    summary = `静息心率趋势为"${rhrT}"，HRV 趋势为"${hrvT}"，两项指标方向不完全一致，建议观察是否存在混合压力源（如训练增加但睡眠改善）。`;
  }

  return { rhrTrend: rhrT, hrvTrend: hrvT, aligned, summary };
}

// ── Composite Assessment ───────────────────────────────────────────

function computeCompositeAssessment(
  rows: DailyMetricRow[],
  sleepConsistency: SleepConsistency,
  recoveryCoherence: RecoveryCoherence,
): CompositeAssessment {
  // Sleep Score (0-100)
  const sleepHours = rows.filter((r) => r.sleepHours !== null).map((r) => r.sleepHours!);
  const avgSleep = averageNumbers(sleepHours);
  const deepPcts = rows.filter((r) => r.deepPct !== null).map((r) => r.deepPct!);
  const avgDeep = averageNumbers(deepPcts);

  let sleepScore: number | null = null;
  if (avgSleep !== null && sleepHours.length >= 5) {
    const durationFactor = linearScore(avgSleep, 5, 8.5) * 0.4;
    const regularityFactor =
      sleepConsistency.bedtimeStdMinutes !== null
        ? linearScore(90 - sleepConsistency.bedtimeStdMinutes, 0, 60) * 0.3
        : 50 * 0.3;
    const deepFactor =
      avgDeep !== null ? linearScore(avgDeep, 5, 20) * 0.3 : 50 * 0.3;
    sleepScore = Math.round(durationFactor + regularityFactor + deepFactor);
  }

  // Recovery Score (0-100)
  const hrvValues = rows.filter((r) => r.hrv !== null).map((r) => r.hrv!);
  const rhrValues = rows.filter((r) => r.restingHR !== null).map((r) => r.restingHR!);
  let recoveryScore: number | null = null;
  if (hrvValues.length >= 5 || rhrValues.length >= 5) {
    const hrvFactor =
      recoveryCoherence.hrvTrend === "improving"
        ? 90
        : recoveryCoherence.hrvTrend === "stable"
          ? 65
          : recoveryCoherence.hrvTrend === "worsening"
            ? 30
            : 50;
    const rhrFactor =
      recoveryCoherence.rhrTrend === "improving"
        ? 90
        : recoveryCoherence.rhrTrend === "stable"
          ? 65
          : recoveryCoherence.rhrTrend === "worsening"
            ? 30
            : 50;
    const sleepAdequacy = avgSleep !== null ? linearScore(avgSleep, 5, 7.5) : 50;
    recoveryScore = Math.round(hrvFactor * 0.4 + rhrFactor * 0.3 + sleepAdequacy * 0.3);
  }

  // Activity Score (0-100)
  const exerciseMins = rows
    .filter((r) => r.exerciseMinutes !== null)
    .map((r) => r.exerciseMinutes!);
  let activityScore: number | null = null;
  if (exerciseMins.length >= 5) {
    const weeklyAvg = (averageNumbers(exerciseMins) ?? 0) * 7;
    const volumeFactor = linearScore(weeklyAvg, 0, 150) * 0.5;
    const exerciseStd = stdDev(exerciseMins);
    const mean = averageNumbers(exerciseMins) ?? 1;
    const cv = exerciseStd !== null && mean > 0 ? exerciseStd / mean : 1;
    const consistencyFactor = linearScore(1 - cv, 0, 1) * 0.5;
    activityScore = Math.round(volumeFactor + consistencyFactor);
  }

  // Overall readiness
  const scores = [sleepScore, recoveryScore, activityScore].filter(
    (s): s is number => s !== null,
  );
  let overallReadiness: CompositeAssessment["overallReadiness"] = null;
  if (scores.length >= 2) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 70) overallReadiness = "good";
    else if (avg >= 45) overallReadiness = "moderate";
    else overallReadiness = "low";
  }

  const readinessLabel =
    overallReadiness === "good"
      ? "良好"
      : overallReadiness === "moderate"
        ? "中等"
        : overallReadiness === "low"
          ? "偏低"
          : "数据不足";

  const parts: string[] = [];
  if (sleepScore !== null) parts.push(`睡眠 ${sleepScore}/100`);
  if (recoveryScore !== null) parts.push(`恢复 ${recoveryScore}/100`);
  if (activityScore !== null) parts.push(`活动 ${activityScore}/100`);

  const summary =
    parts.length > 0
      ? `综合评分：${parts.join("、")}。整体状态${readinessLabel}。${
          overallReadiness === "low"
            ? "建议优先改善睡眠和恢复，暂缓增加训练强度。"
            : overallReadiness === "moderate"
              ? "有改善空间，重点关注评分最低的维度。"
              : "各维度状态较好，可以维持或适当推进训练目标。"
        }`
      : "数据维度不足，无法生成综合评分。";

  return { sleepScore, recoveryScore, activityScore, overallReadiness, summary };
}

// ── Pattern Detection ──────────────────────────────────────────────

function detectPatterns(rows: DailyMetricRow[]): string[] {
  const patterns: string[] = [];

  // Weekend warrior: weekday vs weekend exercise difference
  const weekdayExercise = rows
    .filter((r) => !isWeekend(r.date) && r.exerciseMinutes !== null)
    .map((r) => r.exerciseMinutes!);
  const weekendExercise = rows
    .filter((r) => isWeekend(r.date) && r.exerciseMinutes !== null)
    .map((r) => r.exerciseMinutes!);

  if (weekdayExercise.length >= 5 && weekendExercise.length >= 2) {
    const wdAvg = averageNumbers(weekdayExercise) ?? 0;
    const weAvg = averageNumbers(weekendExercise) ?? 0;
    if (weAvg > wdAvg * 2 && weAvg > 30) {
      patterns.push(
        `周末战士模式：周末平均运动 ${Math.round(weAvg)} 分钟，是工作日 ${Math.round(wdAvg)} 分钟的 ${Math.round(weAvg / Math.max(wdAvg, 1))} 倍。集中运动的受伤风险高于均匀分布，建议在工作日增加轻量活动。`,
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
      patterns.push(
        `夜猫子漂移：入睡时间在分析期内平均后移了约 ${driftMin} 分钟。昼夜节律后移会降低深睡比例和 HRV，建议在早晨增加光照暴露来锚定节律。`,
      );
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
      patterns.push(
        `睡眠补偿模式：工作日平均睡 ${wdAvg.toFixed(1)} 小时，周末 ${weAvg.toFixed(1)} 小时。周末补觉只能部分偿还睡眠债，无法完全恢复认知功能和代谢损失。建议工作日至少保证 7 小时。`,
      );
    }
  }

  // Recovery strain: consecutive high exercise + declining HRV
  let consecutiveHighStrain = 0;
  let maxConsecutive = 0;
  for (const row of rows) {
    const total = (row.exerciseMinutes ?? 0) + (row.workoutMinutes ?? 0);
    if (total >= 45) {
      consecutiveHighStrain++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveHighStrain);
    } else {
      consecutiveHighStrain = 0;
    }
  }
  if (maxConsecutive >= 4) {
    patterns.push(
      `恢复不足风险：出现连续 ${maxConsecutive} 天高运动量（≥45 分钟），缺少恢复日。连续高负荷会累积微损伤并压制 HRV，建议每 2-3 天安排一个轻量恢复日。`,
    );
  }

  return patterns;
}

// ── Main Entry ─────────────────────────────────────────────────────

export function analyzeCrossMetrics(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
): CrossMetricAnalysis {
  const dailyRows = buildDailyRows(parsed, primarySources, window);

  const sleepRecoveryLink = analyzeSleepRecoveryLink(dailyRows);
  const sleepConsistency = analyzeSleepConsistency(dailyRows);
  const activityRecoveryBalance = analyzeActivityRecoveryBalance(dailyRows);
  const recoveryCoherence = analyzeRecoveryCoherence(dailyRows);
  const compositeAssessment = computeCompositeAssessment(
    dailyRows,
    sleepConsistency,
    recoveryCoherence,
  );
  const patterns = detectPatterns(dailyRows);

  return {
    dailyRows,
    sleepRecoveryLink,
    sleepConsistency,
    activityRecoveryBalance,
    recoveryCoherence,
    compositeAssessment,
    patterns,
  };
}
