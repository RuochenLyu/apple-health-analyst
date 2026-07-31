import type {
  ActivityAnalysis,
  ActivityHealthInsights,
  ActivitySummarySample,
  ActivityWindowSummary,
  TimeWindow,
  WorkoutSample,
} from "../types.js";

import type { ActivityT } from "../i18n/zh/activity.js";

import { round, average, subtract } from "./mathUtils.js";
import { buildWorkoutRateDelta, formatWorkoutType, summarizeWorkoutTypes } from "./workoutTypes.js";

const EMPTY_HEALTH_INSIGHTS: ActivityHealthInsights = {
  activityTrend: null,
  activityTrendDelta: null,
  whoGuidelineAssessment: "",
  workoutVariety: "",
  normalRangeAssessment: "",
  interpretation: "",
  actionableAdvice: [],
  doctorTalkingPoints: [],
};

function summarizeActivityWindow(
  activitySummaries: ActivitySummarySample[],
  workouts: WorkoutSample[],
  workoutLabelLocale: "zh" | "en",
) {
  return {
    dayCount: activitySummaries.length,
    activeEnergyBurnedKcal: round(
      average(activitySummaries.map((sample) => sample.activeEnergyBurned).filter((value): value is number => value !== null)),
    ),
    exerciseMinutes: round(
      average(activitySummaries.map((sample) => sample.appleExerciseTime).filter((value): value is number => value !== null)),
    ),
    standHours: round(
      average(activitySummaries.map((sample) => sample.appleStandHours).filter((value): value is number => value !== null)),
    ),
    workouts: workouts.length,
    topWorkoutTypes: summarizeWorkoutTypes(workouts, workoutLabelLocale).slice(0, 5),
  };
}

export function analyzeActivity(
  activitySummaries: ActivitySummarySample[],
  workouts: WorkoutSample[],
  window: TimeWindow,
  t: ActivityT,
): ActivityAnalysis {
  const withinRequestedWindow = <T extends { date?: Date; startDate?: Date }>(value: T) => {
    const date = value.date ?? value.startDate;
    if (!date) {
      return false;
    }
    if (window.effectiveStart && date < window.effectiveStart) {
      return false;
    }
    return date <= window.effectiveEnd;
  };

  const filteredSummaries = activitySummaries.filter(withinRequestedWindow);
  const filteredWorkouts = workouts.filter(withinRequestedWindow);

  const recentSummaries = filteredSummaries.filter(
    (summary) => summary.date >= window.recentStart && summary.date <= window.effectiveEnd,
  );
  const baselineSummaries = filteredSummaries.filter(
    (summary) => summary.date >= window.baselineStart && summary.date < window.recentStart,
  );

  const recentWorkouts = filteredWorkouts.filter(
    (workout) => workout.startDate >= window.recentStart && workout.startDate <= window.effectiveEnd,
  );
  const baselineWorkouts = filteredWorkouts.filter(
    (workout) => workout.startDate >= window.baselineStart && workout.startDate < window.recentStart,
  );

  const recent30d = summarizeActivityWindow(recentSummaries, recentWorkouts, t.workoutLabelLocale);
  const baseline90d = summarizeActivityWindow(baselineSummaries, baselineWorkouts, t.workoutLabelLocale);
  const baselineWindowStart =
    window.effectiveStart && window.effectiveStart > window.baselineStart ? window.effectiveStart : window.baselineStart;
  const baselineWindowEnd = new Date(window.recentStart.getTime() - 1);

  const delta = {
    activeEnergyBurnedKcal: subtract(recent30d.activeEnergyBurnedKcal, baseline90d.activeEnergyBurnedKcal),
    exerciseMinutes: subtract(recent30d.exerciseMinutes, baseline90d.exerciseMinutes),
    standHours: subtract(recent30d.standHours, baseline90d.standHours),
    workouts: buildWorkoutRateDelta(
      recent30d.workouts,
      window.recentStart,
      window.effectiveEnd,
      baseline90d.workouts,
      baselineWindowStart,
      baselineWindowEnd,
    ),
  };

  const healthInsights = buildActivityHealthInsights(recent30d, delta, t);

  return {
    status: filteredSummaries.length > 0 || filteredWorkouts.length > 0 ? "ok" : "insufficient_data",
    source: t.source,
    coverageDays: filteredSummaries.length,
    recent30d,
    baseline90d,
    delta,
    healthInsights,
    notes:
      filteredSummaries.length > 0 || filteredWorkouts.length > 0
        ? [t.activeNote]
        : [t.noDataNote],
  };
}

// ── Health Insight Builders ──

function buildActivityHealthInsights(
  recent: ActivityWindowSummary,
  delta: ActivityAnalysis["delta"],
  t: ActivityT,
): ActivityHealthInsights {
  if (recent.dayCount === 0 && recent.workouts === 0) return EMPTY_HEALTH_INSIGHTS;

  const { trend, trendDelta } = buildActivityTrend(delta);

  return {
    activityTrend: trend,
    activityTrendDelta: trendDelta,
    whoGuidelineAssessment: buildWhoGuidelineAssessment(recent.exerciseMinutes, t),
    workoutVariety: buildWorkoutVariety(recent.topWorkoutTypes, t),
    normalRangeAssessment: buildNormalRangeAssessment(recent, t),
    interpretation: buildInterpretation(recent, delta, trend, t),
    actionableAdvice: buildActionableAdvice(recent, trend, t),
    doctorTalkingPoints: [],
  };
}

function buildActivityTrend(
  delta: ActivityAnalysis["delta"],
): { trend: ActivityHealthInsights["activityTrend"]; trendDelta: number | null } {
  if (delta.exerciseMinutes === null) return { trend: null, trendDelta: null };
  const trend =
    delta.exerciseMinutes >= 10 ? "improving"
    : delta.exerciseMinutes <= -10 ? "declining"
    : "stable";
  return { trend, trendDelta: delta.exerciseMinutes };
}

function buildWhoGuidelineAssessment(exerciseMinutes: number | null, t: ActivityT): string {
  if (exerciseMinutes === null) return t.whoNoData;
  const weeklyMinutes = round(exerciseMinutes * 7) ?? 0;
  return t.exerciseGuidelineContext(weeklyMinutes);
}

function buildWorkoutVariety(
  topWorkoutTypes: ActivityWindowSummary["topWorkoutTypes"],
  t: ActivityT,
): string {
  const count = topWorkoutTypes.length;
  if (count === 0) return t.varietyNone;
  if (count === 1) {
    return t.varietySingle(formatWorkoutType(topWorkoutTypes[0].type, t.workoutLabelLocale));
  }
  if (count <= 3) {
    const separator = t.partSep.trim() || " / ";
    const types = topWorkoutTypes.map((w) => formatWorkoutType(w.type, t.workoutLabelLocale)).join(separator);
    return t.varietyBalanced(types);
  }
  const separator = t.partSep.trim() || " / ";
  const types = topWorkoutTypes
    .slice(0, 4)
    .map((w) => formatWorkoutType(w.type, t.workoutLabelLocale))
    .join(separator);
  return t.varietyRich(types, count);
}

function buildNormalRangeAssessment(recent: ActivityWindowSummary, t: ActivityT): string {
  const parts: string[] = [];

  if (recent.exerciseMinutes !== null) {
    const weeklyMin = round(recent.exerciseMinutes * 7) ?? 0;
    parts.push(t.exerciseRecorded(recent.exerciseMinutes, weeklyMin));
  }

  if (recent.standHours !== null) {
    if (recent.standHours >= 12) {
      parts.push(t.standMeetsGoal(recent.standHours));
    } else if (recent.standHours >= 8) {
      parts.push(t.standReasonable(recent.standHours));
    } else {
      parts.push(t.standLow(recent.standHours));
    }
  }

  if (recent.activeEnergyBurnedKcal !== null) {
    parts.push(t.activeEnergyBurned(recent.activeEnergyBurnedKcal));
  }

  return parts.length > 0 ? parts.join(t.partSep) + t.partEnd : t.normalRangeInsufficientData;
}

function buildInterpretation(
  recent: ActivityWindowSummary,
  delta: ActivityAnalysis["delta"],
  trend: ActivityHealthInsights["activityTrend"],
  t: ActivityT,
): string {
  if (recent.dayCount === 0 && recent.workouts === 0) return t.interpretationInsufficientData;
  const parts: string[] = [];

  if (recent.exerciseMinutes !== null) {
    parts.push(t.exerciseInterpretation);
  }

  // Trend
  if (trend === "improving" && delta.exerciseMinutes !== null) {
    parts.push(t.trendImproving(Math.abs(delta.exerciseMinutes)));
  } else if (trend === "declining" && delta.exerciseMinutes !== null) {
    parts.push(t.trendDeclining(Math.abs(delta.exerciseMinutes)));
  } else if (trend === "stable") {
    parts.push(t.trendStable);
  }

  // Stand hours context
  if (recent.standHours !== null && recent.standHours < 8) {
    parts.push(t.sedentaryWarning);
  }

  return parts.length > 0 ? parts.join(t.sentSep) + t.partEnd : "";
}

function buildActionableAdvice(
  recent: ActivityWindowSummary,
  trend: ActivityHealthInsights["activityTrend"],
  t: ActivityT,
): string[] {
  const advice: string[] = [];

  if (recent.standHours !== null && recent.standHours < 8) {
    advice.push(t.adviceStandMore);
  }

  if (trend === "declining") {
    advice.push(t.adviceDeclining);
  }

  if (recent.topWorkoutTypes.length === 1) {
    advice.push(t.adviceCrossTrain);
  }

  if (advice.length === 0) {
    advice.push(t.adviceGood);
  }
  advice.push(t.adviceTrack);

  return advice;
}
