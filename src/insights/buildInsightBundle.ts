import { analyzeCrossMetrics } from "../analyzers/crossMetric.js";
import { isWithinWindow } from "../normalize/buildTimeWindow.js";
import {
  INSIGHT_SCHEMA_VERSION,
  NARRATIVE_REPORT_SCHEMA_VERSION,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  type ActivitySummarySample,
  type AnalysisSummary,
  type BodyMetricKey,
  type ChartGroup,
  type ChartSeries,
  type DataGap,
  type ActivityHistoricalContext,
  type InsightBundle,
  type InsightHistoricalContext,
  type HistoricalSleepDelta,
  type HistoricalNumericWindow,
  type NotableChange,
  type NumericHistoricalContext,
  type ParsedHealthExport,
  type PrimarySources,
  type QuantitySample,
  type RecoveryMetricKey,
  type RiskFlag,
  type SleepHistoricalContext,
  type SourceConfidence,
  type TimeWindow,
  type WorkoutSample,
} from "../types.js";
import { buildNightSummaries, roundNumber, summarizeSleepWindow } from "../analyzers/sleepShared.js";

import { compressTimeSeries } from "./chartUtils.js";

type TimedMetric = {
  label: string;
  unit: string;
};

const RECOVERY_META: Record<RecoveryMetricKey, TimedMetric> = {
  restingHeartRate: { label: "静息心率", unit: "bpm" },
  hrv: { label: "HRV", unit: "ms" },
  oxygenSaturation: { label: "血氧", unit: "%" },
  respiratoryRate: { label: "呼吸频率", unit: "breaths/min" },
  vo2Max: { label: "最大摄氧量", unit: "mL/min·kg" },
};

const BODY_META: Record<BodyMetricKey, TimedMetric> = {
  bodyMass: { label: "体重", unit: "kg" },
  bodyFatPercentage: { label: "体脂率", unit: "%" },
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function subtract(left: number | null, right: number | null): number | null {
  if (left === null || right === null) {
    return null;
  }
  return roundNumber(left - right);
}

function daysBetweenInclusive(start: Date | null, end: Date | null): number {
  if (!start || !end) {
    return 0;
  }
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
}

function historicalWindow(
  values: number[],
): HistoricalNumericWindow {
  return {
    sampleCount: values.length,
    average: roundNumber(average(values)),
  };
}

function summarizeActivityWindow(activitySummaries: ActivitySummarySample[], workouts: WorkoutSample[]) {
  const workoutCounts = new Map<string, number>();
  for (const workout of workouts) {
    workoutCounts.set(workout.workoutActivityType, (workoutCounts.get(workout.workoutActivityType) ?? 0) + 1);
  }

  return {
    dayCount: activitySummaries.length,
    activeEnergyBurnedKcal: roundNumber(
      average(
        activitySummaries
          .map((sample) => sample.activeEnergyBurned)
          .filter((value): value is number => value !== null),
      ),
    ),
    exerciseMinutes: roundNumber(
      average(
        activitySummaries
          .map((sample) => sample.appleExerciseTime)
          .filter((value): value is number => value !== null),
      ),
    ),
    standHours: roundNumber(
      average(
        activitySummaries
          .map((sample) => sample.appleStandHours)
          .filter((value): value is number => value !== null),
      ),
    ),
    workouts: workouts.length,
    topWorkoutTypes: [...workoutCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count })),
  };
}

function buildSleepDelta(
  recent: ReturnType<typeof summarizeSleepWindow>,
  baseline: ReturnType<typeof summarizeSleepWindow>,
): HistoricalSleepDelta {
  return {
    sleepHours: subtract(recent.avgSleepHours, baseline.avgSleepHours),
    awakeHours: subtract(recent.avgAwakeHours, baseline.avgAwakeHours),
    deepPct: subtract(recent.stagePct.deep, baseline.stagePct.deep),
    remPct: subtract(recent.stagePct.rem, baseline.stagePct.rem),
  };
}

function buildNumericHistoricalContext(
  records: QuantitySample[],
  unitFallback: string,
  window: TimeWindow,
): NumericHistoricalContext | undefined {
  if (records.length === 0) {
    return undefined;
  }

  const filtered = records.filter((record) =>
    window.effectiveStart ? record.startDate >= window.effectiveStart : true,
  );
  if (filtered.length === 0) {
    return undefined;
  }

  const trailing180dStart = new Date(window.effectiveEnd.getTime() - 179 * 24 * 60 * 60 * 1000);
  const recent = filtered
    .filter((record) => record.startDate >= window.recentStart && record.startDate <= window.effectiveEnd)
    .map((record) => record.value);
  const baseline = filtered
    .filter((record) => record.startDate >= window.baselineStart && record.startDate < window.recentStart)
    .map((record) => record.value);
  const trailing180d = filtered
    .filter((record) => record.startDate >= trailing180dStart && record.startDate <= window.effectiveEnd)
    .map((record) => record.value);
  const allTime = filtered.map((record) => record.value);
  const latestRecord = [...filtered].sort((left, right) => right.startDate.getTime() - left.startDate.getTime())[0];

  const recentWindow = historicalWindow(recent);
  const baselineWindow = historicalWindow(baseline);
  const trailingWindow = historicalWindow(trailing180d);
  const allTimeWindow = historicalWindow(allTime);

  return {
    unit: latestRecord?.unit ?? unitFallback,
    coverageDays: new Set(filtered.map((record) => record.startDate.toISOString().slice(0, 10))).size,
    sampleCount: filtered.length,
    latest: latestRecord
      ? {
          timestamp: latestRecord.startDate.toISOString(),
          value: roundNumber(latestRecord.value) ?? latestRecord.value,
        }
      : null,
    recent30d: recentWindow,
    baseline90d: baselineWindow,
    trailing180d: trailingWindow,
    allTime: allTimeWindow,
    recentVsBaseline90d: subtract(recentWindow.average, baselineWindow.average),
    recentVsTrailing180d: subtract(recentWindow.average, trailingWindow.average),
    recentVsAllTime: subtract(recentWindow.average, allTimeWindow.average),
  };
}

function buildSleepHistoricalContext(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
  summary: AnalysisSummary,
): SleepHistoricalContext {
  const source = primarySources.sleep?.canonicalName;
  const records = source
    ? parsed.records.sleep.filter(
        (record) =>
          record.canonicalSource === source &&
          (window.effectiveStart ? record.startDate >= window.effectiveStart : true) &&
          record.startDate <= window.effectiveEnd,
      )
    : [];
  const allNights = buildNightSummaries(records, window.effectiveEnd).filter((night) => night.totalSleepHours >= 3);
  const trailing180dStart = new Date(window.effectiveEnd.getTime() - 179 * 24 * 60 * 60 * 1000);
  const recent = allNights.filter((night) => night.anchor >= window.recentStart && night.anchor <= window.effectiveEnd);
  const baseline = allNights.filter((night) => night.anchor >= window.baselineStart && night.anchor < window.recentStart);
  const trailing = allNights.filter((night) => night.anchor >= trailing180dStart && night.anchor <= window.effectiveEnd);
  const allTime = allNights;

  const recentSummary = summarizeSleepWindow(recent);
  const baselineSummary = summarizeSleepWindow(baseline);
  const trailingSummary = summarizeSleepWindow(trailing);
  const allTimeSummary = summarizeSleepWindow(allTime);

  return {
    coverageDays: summary.sleep.coverageDays,
    sampleCount: summary.sleep.sampleCount,
    staged: summary.sleep.staged,
    recent30d: recentSummary,
    baseline90d: baselineSummary,
    trailing180d: trailingSummary,
    allTime: allTimeSummary,
    recentVsBaseline90d: buildSleepDelta(recentSummary, baselineSummary),
    recentVsTrailing180d: buildSleepDelta(recentSummary, trailingSummary),
    recentVsAllTime: buildSleepDelta(recentSummary, allTimeSummary),
  };
}

function buildActivityHistoricalContext(
  activitySummaries: ActivitySummarySample[],
  workouts: WorkoutSample[],
  window: TimeWindow,
  summary: AnalysisSummary,
): ActivityHistoricalContext {
  const filteredSummaries = activitySummaries.filter((entry) => {
    if (window.effectiveStart && entry.date < window.effectiveStart) {
      return false;
    }
    return entry.date <= window.effectiveEnd;
  });
  const filteredWorkouts = workouts.filter((entry) => {
    if (window.effectiveStart && entry.startDate < window.effectiveStart) {
      return false;
    }
    return entry.startDate <= window.effectiveEnd;
  });
  const trailing180dStart = new Date(window.effectiveEnd.getTime() - 179 * 24 * 60 * 60 * 1000);

  const recentSummaries = filteredSummaries.filter(
    (entry) => entry.date >= window.recentStart && entry.date <= window.effectiveEnd,
  );
  const baselineSummaries = filteredSummaries.filter(
    (entry) => entry.date >= window.baselineStart && entry.date < window.recentStart,
  );
  const trailingSummaries = filteredSummaries.filter(
    (entry) => entry.date >= trailing180dStart && entry.date <= window.effectiveEnd,
  );

  const recentWorkouts = filteredWorkouts.filter(
    (entry) => entry.startDate >= window.recentStart && entry.startDate <= window.effectiveEnd,
  );
  const baselineWorkouts = filteredWorkouts.filter(
    (entry) => entry.startDate >= window.baselineStart && entry.startDate < window.recentStart,
  );
  const trailingWorkouts = filteredWorkouts.filter(
    (entry) => entry.startDate >= trailing180dStart && entry.startDate <= window.effectiveEnd,
  );

  const recentSummary = summarizeActivityWindow(recentSummaries, recentWorkouts);
  const baselineSummary = summarizeActivityWindow(baselineSummaries, baselineWorkouts);
  const trailingSummary = summarizeActivityWindow(trailingSummaries, trailingWorkouts);
  const allTimeSummary = summarizeActivityWindow(filteredSummaries, filteredWorkouts);

  return {
    coverageDays: summary.activity.coverageDays,
    source: summary.activity.source,
    recent30d: recentSummary,
    baseline90d: baselineSummary,
    trailing180d: trailingSummary,
    allTime: allTimeSummary,
    recentVsBaseline90d: {
      activeEnergyBurnedKcal: subtract(recentSummary.activeEnergyBurnedKcal, baselineSummary.activeEnergyBurnedKcal),
      exerciseMinutes: subtract(recentSummary.exerciseMinutes, baselineSummary.exerciseMinutes),
      standHours: subtract(recentSummary.standHours, baselineSummary.standHours),
      workouts: recentSummary.workouts - baselineSummary.workouts,
    },
    recentVsTrailing180d: {
      activeEnergyBurnedKcal: subtract(recentSummary.activeEnergyBurnedKcal, trailingSummary.activeEnergyBurnedKcal),
      exerciseMinutes: subtract(recentSummary.exerciseMinutes, trailingSummary.exerciseMinutes),
      standHours: subtract(recentSummary.standHours, trailingSummary.standHours),
      workouts: recentSummary.workouts - trailingSummary.workouts,
    },
    recentVsAllTime: {
      activeEnergyBurnedKcal: subtract(recentSummary.activeEnergyBurnedKcal, allTimeSummary.activeEnergyBurnedKcal),
      exerciseMinutes: subtract(recentSummary.exerciseMinutes, allTimeSummary.exerciseMinutes),
      standHours: subtract(recentSummary.standHours, allTimeSummary.standHours),
      workouts: recentSummary.workouts - allTimeSummary.workouts,
    },
  };
}

function buildInterpretationHints(
  summary: AnalysisSummary,
  historicalContext: InsightHistoricalContext,
): string[] {
  const hints: string[] = [];
  const sleep = historicalContext.sleep;
  const resting = historicalContext.recovery.restingHeartRate;
  const hrv = historicalContext.recovery.hrv;
  const bodyMass = historicalContext.bodyComposition.bodyMass;
  const activity = historicalContext.activity;

  if (sleep.recent30d.avgSleepHours !== null && sleep.allTime.avgSleepHours !== null) {
    if (sleep.recentVsAllTime.sleepHours !== null && sleep.recentVsAllTime.sleepHours <= -0.5) {
      hints.push(
        `近期睡眠时长低于长期平均 ${Math.abs(sleep.recentVsAllTime.sleepHours)} 小时，优先级应高于继续加训练量。`,
      );
    } else if (sleep.recentVsAllTime.sleepHours !== null && sleep.recentVsAllTime.sleepHours >= 0.5) {
      hints.push(
        `近期睡眠时长高于长期平均 ${sleep.recentVsAllTime.sleepHours} 小时，说明最近的恢复窗口比长期状态更充足。`,
      );
    }
  }

  if (
    resting?.recentVsAllTime !== null &&
    resting?.recentVsAllTime !== undefined &&
    resting.recentVsAllTime >= 3 &&
    hrv?.recentVsAllTime !== null &&
    hrv?.recentVsAllTime !== undefined &&
    hrv.recentVsAllTime <= -5
  ) {
    hints.push("静息心率高于长期平均且 HRV 低于长期平均，常见于恢复负荷偏高、压力上升或近期节奏失衡。");
  } else if (
    resting?.recentVsAllTime !== null &&
    resting?.recentVsAllTime !== undefined &&
    resting.recentVsAllTime <= -2 &&
    hrv?.recentVsAllTime !== null &&
    hrv?.recentVsAllTime !== undefined &&
    hrv.recentVsAllTime >= 5
  ) {
    hints.push("恢复指标比长期平均更从容，通常意味着最近的睡眠、压力和训练安排更可持续。");
  }

  if (
    sleep.recentVsAllTime.sleepHours !== null &&
    sleep.recentVsAllTime.sleepHours >= 0.5 &&
    resting?.recentVsAllTime !== null &&
    resting?.recentVsAllTime !== undefined &&
    Math.abs(resting.recentVsAllTime) < 3 &&
    hrv?.recentVsAllTime !== null &&
    hrv?.recentVsAllTime !== undefined &&
    Math.abs(hrv.recentVsAllTime) < 5
  ) {
    hints.push("睡眠改善已经先出现，但恢复指标还没有形成同方向共振，更适合继续稳住节奏而不是立刻加量。");
  }

  if (
    activity.recentVsAllTime.exerciseMinutes !== null &&
    activity.recentVsAllTime.exerciseMinutes >= 10 &&
    bodyMass?.recentVsAllTime !== null &&
    bodyMass?.recentVsAllTime !== undefined &&
    bodyMass.recentVsAllTime <= -1
  ) {
    hints.push("活动量高于长期平均且体重低于长期平均，如果这是主动目标，当前方向较一致；若并非预期，则要留意摄入和恢复。");
  }

  if (
    activity.recentVsAllTime.exerciseMinutes !== null &&
    activity.recentVsAllTime.exerciseMinutes <= -15 &&
    bodyMass?.recentVsAllTime !== null &&
    bodyMass?.recentVsAllTime !== undefined &&
    bodyMass.recentVsAllTime >= 1
  ) {
    hints.push("近期活动量低于长期平均而体重高于长期平均，更适合先恢复稳定活动与作息，再谈强度提升。");
  }

  if (
    activity.recentVsAllTime.exerciseMinutes !== null &&
    activity.recentVsAllTime.exerciseMinutes >= 10 &&
    !(
      resting?.recentVsAllTime !== null &&
      resting?.recentVsAllTime !== undefined &&
      resting.recentVsAllTime >= 3 &&
      hrv?.recentVsAllTime !== null &&
      hrv?.recentVsAllTime !== undefined &&
      hrv.recentVsAllTime <= -5
    )
  ) {
    hints.push("近期活动量高于长期平均且没有看到明确的恢复恶化信号，当前负荷大致仍在可承受范围。");
  }

  if (
    bodyMass?.recentVsAllTime !== null &&
    bodyMass?.recentVsAllTime !== undefined &&
    bodyMass.recentVsAllTime <= -1 &&
    (activity.recentVsAllTime.exerciseMinutes === null || activity.recentVsAllTime.exerciseMinutes < 10)
  ) {
    hints.push("体重低于长期平均，但活动提升并不明显；如果这不是主动减脂目标，建议回看饮食、睡眠和恢复是否一起在变化。");
  }

  if (
    historicalContext.scope.totalSpanDays >= 180 &&
    summary.activity.recent30d.dayCount < 7 &&
    summary.sleep.coverageDays >= 14
  ) {
    hints.push("历史跨度已经足够长，但最近部分模块记录偏稀疏，近期判断应优先依赖记录更连续的模块。");
  }

  return unique(hints);
}

function latestPointValue(series: ChartSeries | undefined): number | null {
  return [...(series?.points ?? [])].reverse().find((point) => point.value !== null)?.value ?? null;
}

function buildSleepCharts(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
): ChartGroup {
  const source = primarySources.sleep?.canonicalName;
  const records = source
    ? parsed.records.sleep.filter(
        (record) => record.canonicalSource === source && isWithinWindow(record.startDate, window),
      )
    : [];
  const nights = buildNightSummaries(records, window.effectiveEnd).filter((night) => night.totalSleepHours >= 3);
  const toTimedValues = (selector: (night: (typeof nights)[number]) => number | null) =>
    nights.map((night) => ({
      timestamp: night.anchor,
      value: selector(night),
    }));

  return {
    id: "sleep",
    title: "睡眠时长与阶段趋势",
    subtitle: "近 30 天按日保留，较早历史自动压缩为周/月，便于 LLM 聚焦趋势而不是原始样本。",
    series: [
      {
        id: "sleep_hours",
        label: "睡眠时长",
        unit: "小时",
        visual: "line",
        points: compressTimeSeries(toTimedValues((night) => night.totalSleepHours), window.effectiveEnd, "average"),
      },
      {
        id: "sleep_deep_pct",
        label: "深睡占比",
        unit: "%",
        visual: "line",
        points: compressTimeSeries(
          toTimedValues((night) =>
            night.totalSleepHours > 0 ? (night.deepHours / night.totalSleepHours) * 100 : null,
          ),
          window.effectiveEnd,
          "average",
        ),
      },
      {
        id: "sleep_rem_pct",
        label: "REM 占比",
        unit: "%",
        visual: "line",
        points: compressTimeSeries(
          toTimedValues((night) =>
            night.totalSleepHours > 0 ? (night.remHours / night.totalSleepHours) * 100 : null,
          ),
          window.effectiveEnd,
          "average",
        ),
      },
    ],
  };
}

function buildQuantitySeries(
  id: string,
  label: string,
  records: QuantitySample[],
  window: TimeWindow,
  unitFallback: string,
): ChartSeries {
  return {
    id,
    label,
    unit: records[0]?.unit ?? unitFallback,
    visual: "line",
    points: compressTimeSeries(
      records
        .filter((record) => isWithinWindow(record.startDate, window))
        .map((record) => ({
          timestamp: record.startDate,
          value: record.value,
        })),
      window.effectiveEnd,
      "average",
    ),
  };
}

function buildRecoveryCharts(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
): ChartGroup {
  const series = (Object.keys(RECOVERY_META) as RecoveryMetricKey[])
    .map((metric) => {
      const canonicalName = primarySources.recovery[metric]?.canonicalName;
      if (!canonicalName) {
        return null;
      }
      const records = parsed.records[metric].filter((record) => record.canonicalSource === canonicalName);
      if (records.length === 0) {
        return null;
      }
      const meta = RECOVERY_META[metric];
      return buildQuantitySeries(metric, meta.label, records, window, meta.unit);
    })
    .filter((entry): entry is ChartSeries => Boolean(entry));

  return {
    id: "recovery",
    title: "恢复指标对比",
    subtitle: "每项恢复指标保持原始单位，便于在网页中分别展示近期曲线和最新值。",
    series,
  };
}

function buildActivityWorkoutsSeries(workouts: WorkoutSample[], window: TimeWindow): ChartSeries {
  return {
    id: "activity_workouts",
    label: "训练次数",
    unit: "次",
    visual: "bar",
    points: compressTimeSeries(
      workouts
        .filter((workout) => isWithinWindow(workout.startDate, window))
        .map((workout) => ({
          timestamp: workout.startDate,
          value: 1,
        })),
      window.effectiveEnd,
      "sum",
    ),
  };
}

function buildActivityCharts(
  activitySummaries: ActivitySummarySample[],
  workouts: WorkoutSample[],
  window: TimeWindow,
): ChartGroup {
  const filteredSummaries = activitySummaries.filter((summary) => isWithinWindow(summary.date, window));
  return {
    id: "activity",
    title: "活动趋势",
    subtitle: "活动摘要负责日常活动量，训练记录单独统计，避免把不同来源强行混成一个分数。",
    series: [
      {
        id: "activity_energy",
        label: "活动能量",
        unit: "kcal",
        visual: "line",
        points: compressTimeSeries(
          filteredSummaries.map((summary) => ({
            timestamp: summary.date,
            value: summary.activeEnergyBurned,
          })),
          window.effectiveEnd,
          "average",
        ),
      },
      {
        id: "activity_exercise",
        label: "锻炼分钟",
        unit: "分钟",
        visual: "line",
        points: compressTimeSeries(
          filteredSummaries.map((summary) => ({
            timestamp: summary.date,
            value: summary.appleExerciseTime,
          })),
          window.effectiveEnd,
          "average",
        ),
      },
      {
        id: "activity_stand",
        label: "站立小时",
        unit: "小时",
        visual: "line",
        points: compressTimeSeries(
          filteredSummaries.map((summary) => ({
            timestamp: summary.date,
            value: summary.appleStandHours,
          })),
          window.effectiveEnd,
          "average",
        ),
      },
      buildActivityWorkoutsSeries(workouts, window),
    ],
  };
}

function buildBodyCharts(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
): ChartGroup {
  const series = (Object.keys(BODY_META) as BodyMetricKey[])
    .map((metric) => {
      const canonicalName = primarySources.bodyComposition[metric]?.canonicalName;
      if (!canonicalName) {
        return null;
      }
      const records = parsed.records[metric].filter((record) => record.canonicalSource === canonicalName);
      if (records.length === 0) {
        return null;
      }
      const meta = BODY_META[metric];
      return buildQuantitySeries(metric, meta.label, records, window, meta.unit);
    })
    .filter((entry): entry is ChartSeries => Boolean(entry));

  return {
    id: "bodyComposition",
    title: "身体成分趋势",
    subtitle: "优先使用最稳定的体重秤来源，近期变化可以直接对应到体重和体脂两条曲线。",
    series,
  };
}

export function buildSourceConfidence(summary: AnalysisSummary): SourceConfidence[] {
  const recoveryMetrics = Object.values(summary.recovery.metrics).filter(
    (metric): metric is NonNullable<(typeof summary.recovery.metrics)[RecoveryMetricKey]> => Boolean(metric),
  );
  const recoverySampleDays = recoveryMetrics.map((metric) => metric.coverageDays);
  const recoverySources = unique(
    Object.values(summary.recovery.sources).filter((value): value is string => Boolean(value)),
  );
  const bodyMetrics = Object.values(summary.bodyComposition.metrics).filter(Boolean);
  const bodySources = Object.values(summary.bodyComposition.sources).filter(
    (value): value is string => Boolean(value),
  );

  return [
    {
      module: "sleep",
      level:
        summary.sleep.coverageDays >= 14 && summary.sleep.staged
          ? "high"
          : summary.sleep.coverageDays >= 5
            ? "medium"
            : "low",
      summary:
        summary.sleep.source && summary.sleep.coverageDays > 0
          ? `睡眠主数据源为 ${summary.sleep.source}，覆盖 ${summary.sleep.coverageDays} 个夜晚${summary.sleep.staged ? "，包含分阶段睡眠" : ""}。`
          : "睡眠数据不足，趋势解读可信度较低。",
    },
    {
      module: "recovery",
      level:
        recoveryMetrics.length >= 3 && recoverySources.length <= 1 && Math.min(...recoverySampleDays) >= 2
          ? "high"
          : recoveryMetrics.length >= 2
            ? "medium"
            : "low",
      summary:
        recoveryMetrics.length > 0
          ? `恢复指标共覆盖 ${recoveryMetrics.length} 项，主要来自 ${recoverySources.join(" / ")}。`
          : "恢复指标覆盖不足，无法把握恢复趋势。",
    },
    {
      module: "activity",
      level:
        summary.activity.recent30d.dayCount >= 14
          ? "high"
          : summary.activity.recent30d.dayCount >= 5 || summary.activity.recent30d.workouts >= 2
            ? "medium"
            : "low",
      summary:
        summary.activity.status === "ok"
          ? `活动摘要覆盖 ${summary.activity.coverageDays} 天，近 30 天训练 ${summary.activity.recent30d.workouts} 次。`
          : "活动摘要或训练记录不足，活动趋势只能谨慎参考。",
    },
    {
      module: "bodyComposition",
      level:
        (summary.bodyComposition.metrics.bodyMass?.sampleCount ?? 0) >= 4 &&
        (summary.bodyComposition.metrics.bodyFatPercentage?.sampleCount ?? 0) >= 3
          ? "high"
          : bodyMetrics.length > 0
            ? "medium"
            : "low",
      summary:
        bodyMetrics.length > 0
          ? `身体成分来自 ${bodySources.join(" / ") || "已选主数据源"}。`
          : "身体成分样本不足，体重和体脂建议只看方向，不看细小波动。",
    },
  ];
}

export function buildDataGaps(summary: AnalysisSummary): DataGap[] {
  const dataGaps: DataGap[] = [];

  if (summary.sleep.status === "insufficient_data" || summary.sleep.coverageDays < 5) {
    dataGaps.push({
      id: "sleep_insufficient",
      module: "sleep",
      severity: "warning",
      summary: "睡眠夜数偏少，近期与基线的比较稳定性有限。",
    });
  }
  if (summary.sleep.partialNights.length > 0) {
    dataGaps.push({
      id: "sleep_partial_nights",
      module: "sleep",
      severity: "info",
      summary: `已有 ${summary.sleep.partialNights.length} 个睡眠夜晚因记录不完整被排除。`,
    });
  }

  for (const metric of Object.keys(RECOVERY_META) as RecoveryMetricKey[]) {
    const record = summary.recovery.metrics[metric];
    if (!record || record.recent30d.sampleCount < 1) {
      dataGaps.push({
        id: `recovery_${metric}_missing`,
        module: "recovery",
        severity: "warning",
        summary: `${RECOVERY_META[metric].label} 缺少足够近期样本。`,
      });
    }
  }

  if (summary.activity.recent30d.dayCount < 7 && summary.activity.recent30d.workouts < 2) {
    dataGaps.push({
      id: "activity_sparse",
      module: "activity",
      severity: "warning",
      summary: "近期活动摘要覆盖天数偏少，活动趋势更适合看大方向。",
    });
  }

  for (const metric of Object.keys(BODY_META) as BodyMetricKey[]) {
    const record = summary.bodyComposition.metrics[metric];
    if (!record || record.recent30d.sampleCount < 1) {
      dataGaps.push({
        id: `body_${metric}_missing`,
        module: "bodyComposition",
        severity: "warning",
        summary: `${BODY_META[metric].label} 缺少足够近期样本。`,
      });
    }
  }

  return dataGaps;
}

export function buildRiskFlags(summary: AnalysisSummary): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const resting = summary.recovery.metrics.restingHeartRate;
  const hrv = summary.recovery.metrics.hrv;
  const oxygen = summary.recovery.metrics.oxygenSaturation;
  const bodyMass = summary.bodyComposition.metrics.bodyMass;
  const bodyFat = summary.bodyComposition.metrics.bodyFatPercentage;

  if (
    summary.sleep.status === "ok" &&
    summary.sleep.delta.sleepHours !== null &&
    summary.sleep.delta.sleepHours <= -0.75
  ) {
    flags.push({
      id: "sleep_decline",
      module: "sleep",
      severity: summary.sleep.recent30d.avgSleepHours !== null && summary.sleep.recent30d.avgSleepHours < 6 ? "high" : "medium",
      title: "近期睡眠时长下降",
      summary: "近 30 天平均睡眠时长明显低于个人基线，优先检查作息、入睡时间和恢复安排。",
      evidence: [
        `近 30 天平均 ${summary.sleep.recent30d.avgSleepHours ?? "数据不足"} 小时`,
        `基线 90 天平均 ${summary.sleep.baseline90d.avgSleepHours ?? "数据不足"} 小时`,
      ],
      recommendationFocus: "先稳住睡眠窗口和起床时间，再考虑提高训练负荷。",
      seekCare:
        summary.sleep.recent30d.avgSleepHours !== null && summary.sleep.recent30d.avgSleepHours < 5.5,
    });
  }

  if (
    resting?.delta !== null &&
    resting?.delta !== undefined &&
    resting.delta >= 3 &&
    hrv?.delta !== null &&
    hrv?.delta !== undefined &&
    hrv.delta <= -5
  ) {
    flags.push({
      id: "recovery_stress",
      module: "recovery",
      severity: "medium",
      title: "恢复信号偏紧",
      summary: "静息心率上升且 HRV 下滑，常见于恢复不足、压力偏高或近期训练刺激偏大。",
      evidence: [
        `静息心率变化 ${resting.delta} ${resting.unit}`,
        `HRV 变化 ${hrv.delta} ${hrv.unit}`,
      ],
      recommendationFocus: "减少高强度训练，优先保证睡眠和补水，观察一到两周是否回稳。",
      seekCare: false,
    });
  }

  if (oxygen?.latest?.value !== undefined && oxygen.latest.value <= 93) {
    flags.push({
      id: "oxygen_low",
      module: "recovery",
      severity: "high",
      title: "血氧读数偏低",
      summary: "近期血氧读数已经落到偏低区间，应优先确认佩戴质量并留意是否伴随明显不适。",
      evidence: [`最新血氧 ${oxygen.latest.value}${oxygen.unit}`],
      recommendationFocus: "先复测并核对设备佩戴情况，若持续偏低或伴随症状，应尽快咨询专业医生。",
      seekCare: true,
    });
  }

  if (
    summary.activity.delta.exerciseMinutes !== null &&
    summary.activity.delta.exerciseMinutes <= -20 &&
    summary.activity.recent30d.exerciseMinutes !== null
  ) {
    flags.push({
      id: "activity_drop",
      module: "activity",
      severity: "medium",
      title: "近期活动量下降",
      summary: "锻炼分钟数较基线明显回落，身体状态与训练习惯都可能受到影响。",
      evidence: [
        `近 30 天平均锻炼 ${summary.activity.recent30d.exerciseMinutes} 分钟`,
        `基线 90 天平均锻炼 ${summary.activity.baseline90d.exerciseMinutes ?? "数据不足"} 分钟`,
      ],
      recommendationFocus: "优先恢复固定活动节奏，而不是一次性补量。",
      seekCare: false,
    });
  }

  if (
    bodyMass?.delta !== null &&
    bodyMass?.delta !== undefined &&
    Math.abs(bodyMass.delta) >= 2
  ) {
    flags.push({
      id: "body_mass_shift",
      module: "bodyComposition",
      severity: "medium",
      title: "体重变化较快",
      summary: "近 30 天体重相对个人基线变化较快，建议结合饮食、训练负荷和主观状态一起判断。",
      evidence: [`体重变化 ${bodyMass.delta} ${bodyMass.unit}`],
      recommendationFocus: "优先确认变化是否符合预期，再结合体脂、活动量和恢复信号判断。",
      seekCare: false,
    });
  }

  if (
    bodyFat?.delta !== null &&
    bodyFat?.delta !== undefined &&
    Math.abs(bodyFat.delta) >= 2
  ) {
    flags.push({
      id: "body_fat_shift",
      module: "bodyComposition",
      severity: "low",
      title: "体脂率变化值得复核",
      summary: "体脂率变化幅度已经值得单独关注，尤其需要结合测量时段和设备一致性。",
      evidence: [`体脂率变化 ${bodyFat.delta} ${bodyFat.unit}`],
      recommendationFocus: "尽量在固定条件下复测，避免把短期波动误判为稳定趋势。",
      seekCare: false,
    });
  }

  return flags;
}

export function buildNotableChanges(summary: AnalysisSummary, charts: ChartGroup[]): NotableChange[] {
  const changes: NotableChange[] = [];
  const sleepSeries = charts.find((chart) => chart.id === "sleep")?.series[0];
  const bodyMassSeries = charts
    .find((chart) => chart.id === "bodyComposition")
    ?.series.find((series) => series.id === "bodyMass");
  const bodyMass = summary.bodyComposition.metrics.bodyMass;

  if (
    summary.sleep.delta.sleepHours !== null &&
    summary.sleep.delta.sleepHours >= 0.5 &&
    summary.sleep.recent30d.avgSleepHours !== null
  ) {
    changes.push({
      id: "sleep_improved",
      module: "sleep",
      direction: "improving",
      title: "睡眠时长较基线回升",
      summary: "近 30 天平均睡眠时长高于基线，睡眠恢复空间在变好。",
      evidence: [
        `睡眠变化 ${summary.sleep.delta.sleepHours} 小时`,
        `最新睡眠曲线末端约 ${latestPointValue(sleepSeries) ?? "数据不足"} 小时`,
      ],
    });
  }

  const resting = summary.recovery.metrics.restingHeartRate;
  const hrv = summary.recovery.metrics.hrv;
  if (resting && resting.delta !== null && resting.delta <= -2) {
    changes.push({
      id: "resting_hr_improved",
      module: "recovery",
      direction: "improving",
      title: "静息心率较基线更低",
      summary: "静息心率相对个人基线更低，通常意味着恢复状态更从容。",
      evidence: [`静息心率变化 ${resting.delta} ${resting.unit}`],
    });
  }
  if (hrv && hrv.delta !== null && hrv.delta >= 5) {
    changes.push({
      id: "hrv_improved",
      module: "recovery",
      direction: "improving",
      title: "HRV 高于基线",
      summary: "HRV 相对基线回升，通常说明恢复弹性在改善。",
      evidence: [`HRV 变化 ${hrv.delta} ${hrv.unit}`],
    });
  } else if (hrv && hrv.delta !== null && hrv.delta <= -5) {
    changes.push({
      id: "hrv_declined",
      module: "recovery",
      direction: "worsening",
      title: "HRV 低于基线",
      summary: "HRV 已低于近期个人基线，恢复负担值得重点留意。",
      evidence: [`HRV 变化 ${hrv.delta} ${hrv.unit}`],
    });
  }

  if (
    summary.activity.delta.exerciseMinutes !== null &&
    summary.activity.delta.exerciseMinutes >= 15
  ) {
    changes.push({
      id: "activity_up",
      module: "activity",
      direction: "improving",
      title: "近期训练量回升",
      summary: "锻炼分钟数比基线更高，近期训练执行度更强。",
      evidence: [`锻炼分钟变化 ${summary.activity.delta.exerciseMinutes} 分钟`],
    });
  }

  if (bodyMass && bodyMass.delta !== null && bodyMass.delta <= -1.5) {
    changes.push({
      id: "body_mass_down",
      module: "bodyComposition",
      direction: "improving",
      title: "体重呈下降趋势",
      summary: "近 30 天体重低于基线，适合结合活动量和主观状态判断是否符合预期。",
      evidence: [
        `体重变化 ${bodyMass.delta} ${bodyMass.unit}`,
        `最新体重约 ${latestPointValue(bodyMassSeries) ?? "数据不足"} ${bodyMass.unit}`.trim(),
      ],
    });
  }

  return changes;
}

export function buildInsightBundle(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
  summary: AnalysisSummary,
): InsightBundle {
  const charts = [
    buildSleepCharts(parsed, primarySources, window),
    buildRecoveryCharts(parsed, primarySources, window),
    buildActivityCharts(parsed.activitySummaries, parsed.workouts, window),
    buildBodyCharts(parsed, primarySources, window),
  ];
  const historicalContext: InsightHistoricalContext = {
    scope: {
      earliestSeen: summary.coverage.earliestSeen,
      latestSeen: summary.coverage.latestSeen,
      totalSpanDays: daysBetweenInclusive(
        summary.coverage.earliestSeen ? new Date(summary.coverage.earliestSeen) : null,
        summary.coverage.latestSeen ? new Date(summary.coverage.latestSeen) : null,
      ),
    },
    sleep: buildSleepHistoricalContext(parsed, primarySources, window, summary),
    recovery: Object.fromEntries(
      (Object.keys(RECOVERY_META) as RecoveryMetricKey[])
        .map((metric) => {
          const canonicalName = primarySources.recovery[metric]?.canonicalName;
          if (!canonicalName) {
            return [metric, undefined];
          }
          return [
            metric,
            buildNumericHistoricalContext(
              parsed.records[metric].filter((record) => record.canonicalSource === canonicalName),
              RECOVERY_META[metric].unit,
              window,
            ),
          ];
        })
        .filter((entry) => Boolean(entry[1])),
    ) as InsightHistoricalContext["recovery"],
    activity: buildActivityHistoricalContext(parsed.activitySummaries, parsed.workouts, window, summary),
    bodyComposition: Object.fromEntries(
      (Object.keys(BODY_META) as BodyMetricKey[])
        .map((metric) => {
          const canonicalName = primarySources.bodyComposition[metric]?.canonicalName;
          if (!canonicalName) {
            return [metric, undefined];
          }
          return [
            metric,
            buildNumericHistoricalContext(
              parsed.records[metric].filter((record) => record.canonicalSource === canonicalName),
              BODY_META[metric].unit,
              window,
            ),
          ];
        })
        .filter((entry) => Boolean(entry[1])),
    ) as InsightHistoricalContext["bodyComposition"],
    interpretationHints: [],
  };
  historicalContext.interpretationHints = buildInterpretationHints(summary, historicalContext);

  return {
    metadata: {
      tool: PACKAGE_NAME,
      version: PACKAGE_VERSION,
      generatedAt: new Date().toISOString(),
      schemaVersion: INSIGHT_SCHEMA_VERSION,
      language: "zh-CN",
    },
    input: summary.input,
    coverage: summary.coverage,
    primarySources: summary.sources.primary,
    analysis: {
      warnings: summary.warnings,
      sleep: summary.sleep,
      recovery: summary.recovery,
      activity: summary.activity,
      bodyComposition: summary.bodyComposition,
      attachments: summary.attachments,
    },
    charts,
    riskFlags: buildRiskFlags(summary),
    notableChanges: buildNotableChanges(summary, charts),
    dataGaps: buildDataGaps(summary),
    sourceConfidence: buildSourceConfidence(summary),
    historicalContext,
    crossMetric: analyzeCrossMetrics(parsed, primarySources, window),
    narrativeContext: {
      audience: "普通用户",
      goal: "结合最近 30 天、过去 180 天和整个可用历史，生成中文健康管理报告，不做诊断。",
      language: "zh-CN",
      outputSchemaVersion: NARRATIVE_REPORT_SCHEMA_VERSION,
      boundaries: [
        "只能引用 summary.json 和 insights.json 中的事实",
        "可以给出睡眠、恢复、活动、身体成分的健康管理建议",
        "优先结合 historicalContext 中的近 30 天、过去 180 天和全时段背景，不要只看单一窗口",
        "不要生成医学诊断、疾病判断或治疗方案",
        "遇到明显异常时可以给出保守的复查或就医提醒",
      ],
    },
  };
}
