import { analyzeCrossMetrics } from "../analyzers/crossMetric.js";
import type { CrossMetricT } from "../i18n/zh/crossMetric.js";
import { detectPeriods, calculateCycleLengths } from "../analyzers/menstrualCycle.js";
import { buildTrainingInsights } from "../analyzers/training.js";
import {
  buildWorkoutRateDelta,
  buildWorkoutTypeHistoricalContext,
  summarizeWorkoutTypes,
} from "../analyzers/workoutTypes.js";
import type { InsightsT } from "../i18n/zh/insights.js";
import type { TrainingInsightsT } from "../i18n/zh/trainingInsights.js";
import type { Locale } from "../i18n/index.js";
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
import { round, average, subtract } from "../analyzers/mathUtils.js";
import { buildNightSummaries, summarizeSleepWindow } from "../analyzers/sleepShared.js";

import { compressTimeSeries } from "./chartUtils.js";

type TimedMetric = {
  label: string;
  unit: string;
};

const RECOVERY_UNITS: Record<RecoveryMetricKey, string> = {
  restingHeartRate: "bpm",
  hrv: "ms",
  oxygenSaturation: "%",
  respiratoryRate: "breaths/min",
  vo2Max: "mL/kg/min",
};

const BODY_UNITS: Record<BodyMetricKey, string> = {
  bodyMass: "kg",
  bodyFatPercentage: "%",
};

function buildRecoveryMeta(t: InsightsT): Record<RecoveryMetricKey, TimedMetric> {
  return {
    restingHeartRate: { label: t.restingHeartRateLabel, unit: "bpm" },
    hrv: { label: t.hrvLabel, unit: "ms" },
    oxygenSaturation: { label: t.oxygenSaturationLabel, unit: "%" },
    respiratoryRate: { label: t.respiratoryRateLabel, unit: "breaths/min" },
    vo2Max: { label: t.vo2MaxLabel, unit: "mL/kg/min" },
  };
}

function buildBodyMeta(t: InsightsT): Record<BodyMetricKey, TimedMetric> {
  return {
    bodyMass: { label: t.bodyMassLabel, unit: "kg" },
    bodyFatPercentage: { label: t.bodyFatPercentageLabel, unit: "%" },
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function daysBetweenInclusive(start: Date | null, end: Date | null): number {
  if (!start || !end) {
    return 0;
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const startDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const endDay = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  return Math.max(1, Math.floor((endDay - startDay) / dayMs) + 1);
}

function windowCoverage(
  parsed: ParsedHealthExport,
  window: TimeWindow,
): { earliestSeen: Date | null; latestSeen: Date | null } {
  let earliestSeen: Date | null = null;
  let latestSeen: Date | null = null;
  const include = (date: Date) => {
    if (!isWithinWindow(date, window)) {
      return;
    }
    if (!earliestSeen || date < earliestSeen) {
      earliestSeen = date;
    }
    if (!latestSeen || date > latestSeen) {
      latestSeen = date;
    }
  };

  for (const records of Object.values(parsed.records)) {
    for (const record of records) include(record.startDate);
  }
  for (const workout of parsed.workouts) include(workout.startDate);
  for (const summary of parsed.activitySummaries) include(summary.date);
  for (const sample of parsed.menstrualFlow) include(sample.startDate);
  for (const sample of parsed.intermenstrualBleeding) include(sample.startDate);
  for (const sample of parsed.contraceptive) include(sample.startDate);

  return { earliestSeen, latestSeen };
}

function historicalWindow(
  values: number[],
): HistoricalNumericWindow {
  return {
    sampleCount: values.length,
    average: round(average(values)),
  };
}

function summarizeActivityWindow(
  activitySummaries: ActivitySummarySample[],
  workouts: WorkoutSample[],
  locale: Locale,
) {
  return {
    dayCount: activitySummaries.length,
    activeEnergyBurnedKcal: round(
      average(
        activitySummaries
          .map((sample) => sample.activeEnergyBurned)
          .filter((value): value is number => value !== null),
      ),
    ),
    exerciseMinutes: round(
      average(
        activitySummaries
          .map((sample) => sample.appleExerciseTime)
          .filter((value): value is number => value !== null),
      ),
    ),
    standHours: round(
      average(
        activitySummaries
          .map((sample) => sample.appleStandHours)
          .filter((value): value is number => value !== null),
      ),
    ),
    workouts: workouts.length,
    topWorkoutTypes: summarizeWorkoutTypes(workouts, locale).slice(0, 5),
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

  const filtered = records.filter((record) => isWithinWindow(record.startDate, window));
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
          value: round(latestRecord.value) ?? latestRecord.value,
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
  locale: Locale,
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
  const baselineWindowStart =
    window.effectiveStart && window.effectiveStart > window.baselineStart ? window.effectiveStart : window.baselineStart;
  const baselineWindowEnd = new Date(window.recentStart.getTime() - 1);

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

  const recentSummary = summarizeActivityWindow(recentSummaries, recentWorkouts, locale);
  const baselineSummary = summarizeActivityWindow(baselineSummaries, baselineWorkouts, locale);
  const trailingSummary = summarizeActivityWindow(trailingSummaries, trailingWorkouts, locale);
  const allTimeSummary = summarizeActivityWindow(filteredSummaries, filteredWorkouts, locale);

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
      workouts: buildWorkoutRateDelta(
        recentSummary.workouts,
        window.recentStart,
        window.effectiveEnd,
        baselineSummary.workouts,
        baselineWindowStart,
        baselineWindowEnd,
      ),
    },
    recentVsTrailing180d: {
      activeEnergyBurnedKcal: subtract(recentSummary.activeEnergyBurnedKcal, trailingSummary.activeEnergyBurnedKcal),
      exerciseMinutes: subtract(recentSummary.exerciseMinutes, trailingSummary.exerciseMinutes),
      standHours: subtract(recentSummary.standHours, trailingSummary.standHours),
      workouts: buildWorkoutRateDelta(
        recentSummary.workouts,
        window.recentStart,
        window.effectiveEnd,
        trailingSummary.workouts,
        trailing180dStart,
        window.effectiveEnd,
      ),
    },
    recentVsAllTime: {
      activeEnergyBurnedKcal: subtract(recentSummary.activeEnergyBurnedKcal, allTimeSummary.activeEnergyBurnedKcal),
      exerciseMinutes: subtract(recentSummary.exerciseMinutes, allTimeSummary.exerciseMinutes),
      standHours: subtract(recentSummary.standHours, allTimeSummary.standHours),
      workouts: buildWorkoutRateDelta(
        recentSummary.workouts,
        window.recentStart,
        window.effectiveEnd,
        allTimeSummary.workouts,
        window.effectiveStart ?? filteredWorkouts[0]?.startDate ?? null,
        window.effectiveEnd,
      ),
    },
    workoutTypes: buildWorkoutTypeHistoricalContext(
      filteredWorkouts,
      window,
      locale === "zh" ? "zh" : "en",
    ),
  };
}

function buildInterpretationHints(
  summary: AnalysisSummary,
  historicalContext: InsightHistoricalContext,
  t: InsightsT,
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
        t.hintSleepBelowLongTerm(Math.abs(sleep.recentVsAllTime.sleepHours)),
      );
    } else if (sleep.recentVsAllTime.sleepHours !== null && sleep.recentVsAllTime.sleepHours >= 0.5) {
      hints.push(
        t.hintSleepAboveLongTerm(sleep.recentVsAllTime.sleepHours),
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
    hints.push(t.hintRecoveryStress);
  } else if (
    resting?.recentVsAllTime !== null &&
    resting?.recentVsAllTime !== undefined &&
    resting.recentVsAllTime <= -2 &&
    hrv?.recentVsAllTime !== null &&
    hrv?.recentVsAllTime !== undefined &&
    hrv.recentVsAllTime >= 5
  ) {
    hints.push(t.hintRecoveryRelaxed);
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
    hints.push(t.hintSleepImprovedRecoveryLagging);
  }

  if (
    activity.recentVsAllTime.exerciseMinutes !== null &&
    activity.recentVsAllTime.exerciseMinutes >= 10 &&
    bodyMass?.recentVsAllTime !== null &&
    bodyMass?.recentVsAllTime !== undefined &&
    bodyMass.recentVsAllTime <= -1
  ) {
    hints.push(t.hintActivityUpWeightDown);
  }

  if (
    activity.recentVsAllTime.exerciseMinutes !== null &&
    activity.recentVsAllTime.exerciseMinutes <= -15 &&
    bodyMass?.recentVsAllTime !== null &&
    bodyMass?.recentVsAllTime !== undefined &&
    bodyMass.recentVsAllTime >= 1
  ) {
    hints.push(t.hintActivityDownWeightUp);
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
    hints.push(t.hintActivityUpRecoveryOk);
  }

  if (
    bodyMass?.recentVsAllTime !== null &&
    bodyMass?.recentVsAllTime !== undefined &&
    bodyMass.recentVsAllTime <= -1 &&
    (activity.recentVsAllTime.exerciseMinutes === null || activity.recentVsAllTime.exerciseMinutes < 10)
  ) {
    hints.push(t.hintWeightDownActivityFlat);
  }

  if (
    historicalContext.scope.totalSpanDays >= 180 &&
    summary.activity.recent30d.dayCount < 7 &&
    summary.sleep.coverageDays >= 14
  ) {
    hints.push(t.hintSparseModules);
  }

  if (summary.menstrualCycle && summary.menstrualCycle.totalPeriods >= 3) {
    const mc = summary.menstrualCycle;
    if (mc.regularity === "regular") {
      hints.push(t.hintMenstrualRegular(mc.avgCycleLengthDays!, mc.cycleLengthStdDays!));
    } else if (mc.regularity === "irregular") {
      hints.push(t.hintMenstrualIrregular(mc.cycleLengthStdDays!));
    }
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
  t: InsightsT,
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
    title: t.sleepChartTitle,
    subtitle: t.sleepChartSubtitle,
    series: [
      {
        id: "sleep_hours",
        label: t.sleepHoursLabel,
        unit: t.sleepHoursUnit,
        visual: "line",
        points: compressTimeSeries(toTimedValues((night) => night.totalSleepHours), window.effectiveEnd, "average"),
      },
      {
        id: "sleep_deep_pct",
        label: t.deepSleepPctLabel,
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
        label: t.remSleepPctLabel,
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
  t: InsightsT,
): ChartGroup {
  const recoveryMeta = buildRecoveryMeta(t);
  const series = (Object.keys(recoveryMeta) as RecoveryMetricKey[])
    .map((metric) => {
      const canonicalName = primarySources.recovery[metric]?.canonicalName;
      if (!canonicalName) {
        return null;
      }
      const records = parsed.records[metric].filter((record) => record.canonicalSource === canonicalName);
      if (records.length === 0) {
        return null;
      }
      const meta = recoveryMeta[metric];
      return buildQuantitySeries(metric, meta.label, records, window, meta.unit);
    })
    .filter((entry): entry is ChartSeries => Boolean(entry));

  return {
    id: "recovery",
    title: t.recoveryChartTitle,
    subtitle: t.recoveryChartSubtitle,
    series,
  };
}

function buildActivityWorkoutsSeries(workouts: WorkoutSample[], window: TimeWindow, t: InsightsT): ChartSeries {
  return {
    id: "activity_workouts",
    label: t.workoutCountLabel,
    unit: t.workoutCountUnit,
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
  t: InsightsT,
): ChartGroup {
  const filteredSummaries = activitySummaries.filter((summary) => isWithinWindow(summary.date, window));
  return {
    id: "activity",
    title: t.activityChartTitle,
    subtitle: t.activityChartSubtitle,
    series: [
      {
        id: "activity_energy",
        label: t.activityEnergyLabel,
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
        label: t.exerciseMinutesLabel,
        unit: t.exerciseMinutesUnit,
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
        label: t.standHoursLabel,
        unit: t.standHoursUnit,
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
      buildActivityWorkoutsSeries(workouts, window, t),
    ],
  };
}

function buildBodyCharts(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
  t: InsightsT,
): ChartGroup {
  const bodyMeta = buildBodyMeta(t);
  const series = (Object.keys(bodyMeta) as BodyMetricKey[])
    .map((metric) => {
      const canonicalName = primarySources.bodyComposition[metric]?.canonicalName;
      if (!canonicalName) {
        return null;
      }
      const records = parsed.records[metric].filter((record) => record.canonicalSource === canonicalName);
      if (records.length === 0) {
        return null;
      }
      const meta = bodyMeta[metric];
      return buildQuantitySeries(metric, meta.label, records, window, meta.unit);
    })
    .filter((entry): entry is ChartSeries => Boolean(entry));

  return {
    id: "bodyComposition",
    title: t.bodyChartTitle,
    subtitle: t.bodyChartSubtitle,
    series,
  };
}

function buildMenstrualCycleCharts(
  parsed: ParsedHealthExport,
  window: TimeWindow,
  t: InsightsT,
): ChartGroup | null {
  const flowSamples = parsed.menstrualFlow.filter((sample) =>
    isWithinWindow(sample.startDate, window),
  );
  if (flowSamples.length === 0) return null;

  const periods = detectPeriods(flowSamples);
  if (periods.length < 2) return null;

  const cycleLengths = calculateCycleLengths(periods);

  // Cycle length line series: one point per cycle
  const cycleLengthPoints = periods.slice(1).map((period, idx) => {
    const prevStart = new Date(periods[idx].startDate);
    const currStart = new Date(period.startDate);
    const days = Math.round(Math.abs(currStart.getTime() - prevStart.getTime()) / (24 * 60 * 60 * 1000));
    return {
      start: period.startDate,
      end: period.startDate,
      granularity: "day" as const,
      label: period.startDate.slice(5),
      value: days >= 15 && days <= 90 ? days : null,
      sampleCount: 1,
    };
  });

  // Period duration bar series: one bar per period
  const periodDurationPoints = periods.map((period) => ({
    start: period.startDate,
    end: period.endDate,
    granularity: "day" as const,
    label: period.startDate.slice(5),
    value: period.durationDays,
    sampleCount: 1,
  }));

  return {
    id: "menstrualCycle",
    title: t.menstrualChartTitle,
    subtitle:
      cycleLengths.length > 0
        ? t.menstrualChartSubtitleWithAvg(periods.length, round(cycleLengths.reduce((s, v) => s + v, 0) / cycleLengths.length)!)
        : t.menstrualChartSubtitleNoAvg(periods.length),
    series: [
      {
        id: "cycle_length",
        label: t.cycleLengthLabel,
        unit: t.cycleLengthUnit,
        visual: "line",
        points: cycleLengthPoints,
      },
      {
        id: "period_duration",
        label: t.periodDurationLabel,
        unit: t.periodDurationUnit,
        visual: "bar",
        points: periodDurationPoints,
      },
    ],
  };
}

export function buildSourceConfidence(summary: AnalysisSummary, t: InsightsT): SourceConfidence[] {
  const recoveryMetrics = Object.values(summary.recovery.metrics).filter(
    (metric): metric is NonNullable<(typeof summary.recovery.metrics)[RecoveryMetricKey]> => Boolean(metric),
  );
  const recentRecoveryMetrics = recoveryMetrics.filter(
    (metric) => metric.recent30d.sampleCount > 0,
  );
  const recentRecoverySampleCounts = recentRecoveryMetrics.map(
    (metric) => metric.recent30d.sampleCount,
  );
  const recoverySources = unique(
    (Object.keys(summary.recovery.metrics) as RecoveryMetricKey[])
      .filter((metric) => (summary.recovery.metrics[metric]?.recent30d.sampleCount ?? 0) > 0)
      .map((metric) => summary.recovery.sources[metric])
      .filter((value): value is string => Boolean(value)),
  );
  const bodyMetrics = Object.values(summary.bodyComposition.metrics).filter(Boolean);
  const recentBodyMetrics = bodyMetrics.filter(
    (metric) => (metric?.recent30d.sampleCount ?? 0) > 0,
  );
  const bodySources = unique(
    (Object.keys(summary.bodyComposition.metrics) as BodyMetricKey[])
      .filter((metric) => (summary.bodyComposition.metrics[metric]?.recent30d.sampleCount ?? 0) > 0)
      .map((metric) => summary.bodyComposition.sources[metric])
      .filter(
      (value): value is string => Boolean(value),
    ),
  );
  const recentSleepNights = summary.sleep.recent30d.nights;

  return [
    {
      module: "sleep",
      level:
        recentSleepNights >= 14 && summary.sleep.staged
          ? "high"
          : recentSleepNights >= 5
            ? "medium"
            : "low",
      summary:
        summary.sleep.source && recentSleepNights > 0
          ? t.sleepConfidenceSummary(summary.sleep.source, recentSleepNights, summary.sleep.staged)
          : t.sleepConfidenceInsufficient,
    },
    {
      module: "recovery",
      level:
        recentRecoveryMetrics.length >= 3 &&
        recentRecoveryMetrics.length === recoveryMetrics.length &&
        recoverySources.length <= 1 &&
        Math.min(...recentRecoverySampleCounts) >= 2
          ? "high"
          : recentRecoveryMetrics.length >= 2
            ? "medium"
            : "low",
      summary:
        recentRecoveryMetrics.length > 0
          ? t.recoveryConfidenceSummary(
              recentRecoveryMetrics.length,
              recoveryMetrics.length,
              recoverySources.join(" / "),
            )
          : t.recoveryConfidenceInsufficient,
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
          ? t.activityConfidenceSummary(
              summary.activity.recent30d.dayCount,
              summary.activity.recent30d.workouts,
            )
          : t.activityConfidenceInsufficient,
    },
    {
      module: "bodyComposition",
      level:
        (summary.bodyComposition.metrics.bodyMass?.recent30d.sampleCount ?? 0) >= 4 &&
        (summary.bodyComposition.metrics.bodyFatPercentage?.recent30d.sampleCount ?? 0) >= 3
          ? "high"
          : recentBodyMetrics.length > 0
            ? "medium"
            : "low",
      summary:
        recentBodyMetrics.length > 0
          ? t.bodyConfidenceSummary(
              recentBodyMetrics.length,
              bodyMetrics.length,
              bodySources.join(" / ") || t.bodyConfidenceDefaultSource,
            )
          : t.bodyConfidenceInsufficient,
    },
    ...(summary.menstrualCycle
      ? [
          {
            module: "menstrualCycle" as const,
            level: (summary.menstrualCycle.totalPeriods >= 6
              ? "high"
              : summary.menstrualCycle.totalPeriods >= 3
                ? "medium"
                : "low") as SourceConfidence["level"],
            summary: t.menstrualConfidenceSummary(summary.menstrualCycle.totalPeriods, summary.menstrualCycle.coverageDays),
          },
        ]
      : []),
  ];
}

export function buildDataGaps(summary: AnalysisSummary, t: InsightsT): DataGap[] {
  const dataGaps: DataGap[] = [];
  const recoveryMeta = buildRecoveryMeta(t);
  const bodyMeta = buildBodyMeta(t);

  if (summary.sleep.status === "insufficient_data" || summary.sleep.coverageDays < 5) {
    dataGaps.push({
      id: "sleep_insufficient",
      module: "sleep",
      severity: "warning",
      summary: t.sleepInsufficientGap,
    });
  }
  if (summary.sleep.partialNights.length > 0) {
    dataGaps.push({
      id: "sleep_partial_nights",
      module: "sleep",
      severity: "info",
      summary: t.sleepPartialNightsGap(summary.sleep.partialNights.length),
    });
  }

  for (const metric of Object.keys(recoveryMeta) as RecoveryMetricKey[]) {
    const record = summary.recovery.metrics[metric];
    if (!record || record.recent30d.sampleCount < 1) {
      dataGaps.push({
        id: `recovery_${metric}_missing`,
        module: "recovery",
        severity: "warning",
        summary: t.recoveryMetricMissingGap(recoveryMeta[metric].label),
      });
    }
  }

  if (summary.activity.recent30d.dayCount < 7 && summary.activity.recent30d.workouts < 2) {
    dataGaps.push({
      id: "activity_sparse",
      module: "activity",
      severity: "warning",
      summary: t.activitySparseGap,
    });
  }

  for (const metric of Object.keys(bodyMeta) as BodyMetricKey[]) {
    const record = summary.bodyComposition.metrics[metric];
    if (!record || record.recent30d.sampleCount < 1) {
      dataGaps.push({
        id: `body_${metric}_missing`,
        module: "bodyComposition",
        severity: "warning",
        summary: t.bodyMetricMissingGap(bodyMeta[metric].label),
      });
    }
  }

  if (summary.menstrualCycle && summary.menstrualCycle.totalPeriods < 3) {
    dataGaps.push({
      id: "menstrual_sparse",
      module: "menstrualCycle",
      severity: "warning",
      summary: t.menstrualSparseGap,
    });
  }

  return dataGaps;
}

export function buildRiskFlags(summary: AnalysisSummary, t: InsightsT): RiskFlag[] {
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
      title: t.sleepDeclineTitle,
      summary: t.sleepDeclineSummary,
      evidence: t.sleepDeclineEvidence(
        String(summary.sleep.recent30d.avgSleepHours ?? "—"),
        String(summary.sleep.baseline90d.avgSleepHours ?? "—"),
      ),
      recommendationFocus: t.sleepDeclineRecommendation,
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
      title: t.recoveryStressTitle,
      summary: t.recoveryStressSummary,
      evidence: t.recoveryStressEvidence(
        `${resting.delta} ${resting.unit}`,
        `${hrv.delta} ${hrv.unit}`,
      ),
      recommendationFocus: t.recoveryStressRecommendation,
      seekCare: false,
    });
  }

  if (
    oxygen?.recent30d.average !== null &&
    oxygen?.recent30d.average !== undefined &&
    oxygen.recent30d.average <= 93 &&
    oxygen.recent30d.sampleCount >= 3
  ) {
    flags.push({
      id: "oxygen_low",
      module: "recovery",
      severity: "high",
      title: t.oxygenLowTitle,
      summary: t.oxygenLowSummary,
      evidence: t.oxygenLowEvidence(
        `${oxygen.recent30d.average}${oxygen.unit} (${oxygen.recent30d.sampleCount} samples)`,
      ),
      recommendationFocus: t.oxygenLowRecommendation,
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
      title: t.activityDropTitle,
      summary: t.activityDropSummary,
      evidence: t.activityDropEvidence(
        String(summary.activity.recent30d.exerciseMinutes),
        String(summary.activity.baseline90d.exerciseMinutes ?? "—"),
      ),
      recommendationFocus: t.activityDropRecommendation,
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
      title: t.bodyMassShiftTitle,
      summary: t.bodyMassShiftSummary,
      evidence: t.bodyMassShiftEvidence(`${bodyMass.delta} ${bodyMass.unit}`),
      recommendationFocus: t.bodyMassShiftRecommendation,
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
      title: t.bodyFatShiftTitle,
      summary: t.bodyFatShiftSummary,
      evidence: t.bodyFatShiftEvidence(`${bodyFat.delta} ${bodyFat.unit}`),
      recommendationFocus: t.bodyFatShiftRecommendation,
      seekCare: false,
    });
  }

  if (summary.menstrualCycle) {
    const mc = summary.menstrualCycle;
    if (mc.regularity === "irregular" && mc.cycleLengthStdDays !== null) {
      flags.push({
        id: "menstrual_irregular",
        module: "menstrualCycle",
        severity: "medium",
        title: t.menstrualIrregularTitle,
        summary: t.menstrualIrregularSummary,
        evidence: t.menstrualIrregularEvidence(String(mc.cycleLengthStdDays), String(mc.avgCycleLengthDays)),
        recommendationFocus: t.menstrualIrregularRecommendation,
        seekCare: mc.cycleLengthStdDays > 10,
      });
    }
    if (mc.avgCycleLengthDays !== null && (mc.avgCycleLengthDays < 21 || mc.avgCycleLengthDays > 38)) {
      flags.push({
        id: "menstrual_cycle_length_abnormal",
        module: "menstrualCycle",
        severity: "medium",
        title: t.menstrualCycleLengthAbnormalTitle,
        summary: t.menstrualCycleLengthAbnormalSummary(mc.avgCycleLengthDays!),
        evidence: t.menstrualCycleLengthAbnormalEvidence(mc.avgCycleLengthDays!),
        recommendationFocus: t.menstrualCycleLengthAbnormalRecommendation,
        seekCare: true,
      });
    }
    if (mc.intermenstrualBleedingFrequencyPerCycle !== null && mc.intermenstrualBleedingFrequencyPerCycle > 0.3) {
      flags.push({
        id: "menstrual_intermenstrual_bleeding",
        module: "menstrualCycle",
        severity: "low",
        title: t.intermenstrualBleedingTitle,
        summary: t.intermenstrualBleedingSummary,
        evidence: t.intermenstrualBleedingEvidence(mc.intermenstrualBleedingCount!, mc.intermenstrualBleedingFrequencyPerCycle!),
        recommendationFocus: t.intermenstrualBleedingRecommendation,
        seekCare: false,
      });
    }
  }

  return flags;
}

export function buildNotableChanges(summary: AnalysisSummary, charts: ChartGroup[], t: InsightsT): NotableChange[] {
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
      title: t.sleepImprovedTitle,
      summary: t.sleepImprovedSummary,
      evidence: t.sleepImprovedEvidence(
        String(summary.sleep.delta.sleepHours),
        String(latestPointValue(sleepSeries) ?? "—"),
      ),
    });
  }

  const resting = summary.recovery.metrics.restingHeartRate;
  const hrv = summary.recovery.metrics.hrv;
  if (resting && resting.delta !== null && resting.delta <= -2) {
    changes.push({
      id: "resting_hr_improved",
      module: "recovery",
      direction: "improving",
      title: t.restingHrImprovedTitle,
      summary: t.restingHrImprovedSummary,
      evidence: t.restingHrImprovedEvidence(`${resting.delta} ${resting.unit}`),
    });
  }
  if (hrv && hrv.delta !== null && hrv.delta >= 5) {
    changes.push({
      id: "hrv_improved",
      module: "recovery",
      direction: "improving",
      title: t.hrvImprovedTitle,
      summary: t.hrvImprovedSummary,
      evidence: t.hrvImprovedEvidence(`${hrv.delta} ${hrv.unit}`),
    });
  } else if (hrv && hrv.delta !== null && hrv.delta <= -5) {
    changes.push({
      id: "hrv_declined",
      module: "recovery",
      direction: "worsening",
      title: t.hrvDeclinedTitle,
      summary: t.hrvDeclinedSummary,
      evidence: t.hrvDeclinedEvidence(`${hrv.delta} ${hrv.unit}`),
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
      title: t.activityUpTitle,
      summary: t.activityUpSummary,
      evidence: t.activityUpEvidence(String(summary.activity.delta.exerciseMinutes)),
    });
  }

  if (bodyMass && bodyMass.delta !== null && bodyMass.delta <= -1.5) {
    changes.push({
      id: "body_mass_down",
      module: "bodyComposition",
      direction: "improving",
      title: t.bodyMassDownTitle,
      summary: t.bodyMassDownSummary,
      evidence: t.bodyMassDownEvidence(
        `${bodyMass.delta} ${bodyMass.unit}`,
        `${latestPointValue(bodyMassSeries) ?? "—"} ${bodyMass.unit}`.trim(),
      ),
    });
  }

  if (summary.menstrualCycle) {
    const mc = summary.menstrualCycle;
    if (mc.regularity === "regular" && mc.totalPeriods >= 3) {
      changes.push({
        id: "menstrual_regular",
        module: "menstrualCycle",
        direction: "stable",
        title: t.menstrualRegularTitle,
        summary: t.menstrualRegularSummary(mc.avgCycleLengthDays!, mc.cycleLengthStdDays!),
        evidence: t.menstrualRegularEvidence(mc.totalPeriods, mc.cycleLengthStdDays!),
      });
    }
    if (
      mc.recent90d.avgCycleLengthDays !== null &&
      mc.historical.avgCycleLengthDays !== null &&
      mc.historical.periods >= 3
    ) {
      const delta = mc.recent90d.avgCycleLengthDays - mc.historical.avgCycleLengthDays;
      if (Math.abs(delta) >= 3) {
        changes.push({
          id: "menstrual_cycle_shift",
          module: "menstrualCycle",
          direction: "mixed",
          title: t.menstrualCycleShiftTitle,
          summary: t.menstrualCycleShiftSummary(
            mc.recent90d.avgCycleLengthDays!,
            mc.historical.avgCycleLengthDays!,
            `${delta > 0 ? "+" : ""}${round(delta)}`,
          ),
          evidence: t.menstrualCycleShiftEvidence(
            mc.recent90d.avgCycleLengthDays!,
            mc.historical.avgCycleLengthDays!,
          ),
        });
      }
    }
  }

  return changes;
}

export interface BuildInsightBundleOptions {
  /** Maximum number of primary sports to include in the training report. */
  topSportCount?: number;
}

export function buildInsightBundle(
  parsed: ParsedHealthExport,
  primarySources: PrimarySources,
  window: TimeWindow,
  summary: AnalysisSummary,
  t: InsightsT,
  trainingT: TrainingInsightsT,
  locale: Locale,
  crossMetricT?: CrossMetricT,
  options: BuildInsightBundleOptions = {},
): InsightBundle {
  const scopeCoverage = windowCoverage(parsed, window);
  const menstrualChart = buildMenstrualCycleCharts(parsed, window, t);
  const charts = [
    buildSleepCharts(parsed, primarySources, window, t),
    buildRecoveryCharts(parsed, primarySources, window, t),
    buildActivityCharts(parsed.activitySummaries, parsed.workouts, window, t),
    buildBodyCharts(parsed, primarySources, window, t),
    ...(menstrualChart ? [menstrualChart] : []),
  ];
  const historicalContext: InsightHistoricalContext = {
    scope: {
      earliestSeen: scopeCoverage.earliestSeen?.toISOString() ?? null,
      latestSeen: scopeCoverage.latestSeen?.toISOString() ?? null,
      totalSpanDays: daysBetweenInclusive(
        scopeCoverage.earliestSeen,
        scopeCoverage.latestSeen,
      ),
    },
    sleep: buildSleepHistoricalContext(parsed, primarySources, window, summary),
    recovery: Object.fromEntries(
      (Object.keys(RECOVERY_UNITS) as RecoveryMetricKey[])
        .map((metric) => {
          const canonicalName = primarySources.recovery[metric]?.canonicalName;
          if (!canonicalName) {
            return [metric, undefined];
          }
          return [
            metric,
            buildNumericHistoricalContext(
              parsed.records[metric].filter((record) => record.canonicalSource === canonicalName),
              RECOVERY_UNITS[metric],
              window,
            ),
          ];
        })
        .filter((entry) => Boolean(entry[1])),
    ) as InsightHistoricalContext["recovery"],
    activity: buildActivityHistoricalContext(parsed.activitySummaries, parsed.workouts, window, summary, locale),
    bodyComposition: Object.fromEntries(
      (Object.keys(BODY_UNITS) as BodyMetricKey[])
        .map((metric) => {
          const canonicalName = primarySources.bodyComposition[metric]?.canonicalName;
          if (!canonicalName) {
            return [metric, undefined];
          }
          return [
            metric,
            buildNumericHistoricalContext(
              parsed.records[metric].filter((record) => record.canonicalSource === canonicalName),
              BODY_UNITS[metric],
              window,
            ),
          ];
        })
        .filter((entry) => Boolean(entry[1])),
    ) as InsightHistoricalContext["bodyComposition"],
    interpretationHints: [],
  };
  historicalContext.interpretationHints = buildInterpretationHints(summary, historicalContext, t);
  const crossMetric = analyzeCrossMetrics(parsed, primarySources, window, crossMetricT!);
  const training = buildTrainingInsights(
    parsed,
    primarySources,
    window,
    historicalContext,
    crossMetric.activityRecoveryBalance.recoveryAdequate,
    trainingT,
    { topSportCount: options.topSportCount },
  );

  return {
    metadata: {
      tool: PACKAGE_NAME,
      version: PACKAGE_VERSION,
      generatedAt: new Date().toISOString(),
      schemaVersion: INSIGHT_SCHEMA_VERSION,
      language: t.metadataLanguage,
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
      menstrualCycle: summary.menstrualCycle,
      attachments: summary.attachments,
    },
    charts,
    riskFlags: buildRiskFlags(summary, t),
    notableChanges: buildNotableChanges(summary, charts, t),
    dataGaps: buildDataGaps(summary, t),
    sourceConfidence: buildSourceConfidence(summary, t),
    historicalContext,
    crossMetric,
    narrativeContext: {
      audience: t.narrativeAudience,
      goal: t.narrativeGoal,
      language: t.metadataLanguage,
      outputSchemaVersion: NARRATIVE_REPORT_SCHEMA_VERSION,
      boundaries: t.narrativeBoundaries,
    },
    training,
  };
}
