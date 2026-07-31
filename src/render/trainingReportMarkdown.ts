import type { TrainingRenderT } from "../i18n/zh/trainingRender.js";
import type {
  InsightBundle,
  TrainingLoadStatus,
  TrainingNarrativeReport,
  TrainingReadiness,
  TrainingSportInsight,
  TrainingState,
  WorkoutTypeWindowSummary,
} from "../types.js";

type SportWindowId = "recent30d" | "baseline90d" | "trailing180d" | "trailing365d" | "allTime";

const DISTANCE_WORKOUT_TYPES = new Set([
  "HKWorkoutActivityTypeRunning",
  "HKWorkoutActivityTypeWalking",
  "HKWorkoutActivityTypeCycling",
  "HKWorkoutActivityTypeHiking",
]);

function displayNumber(value: number, t: TrainingRenderT): string {
  return value.toLocaleString(t.locale, { maximumFractionDigits: 1 });
}

function fmt(value: number | null, suffix: string, t: TrainingRenderT): string {
  return value === null ? t.insufficientData : `${displayNumber(value, t)}${suffix}`;
}

function labeled(label: string, value: string, t: TrainingRenderT): string {
  return t.htmlLang === "zh-CN" ? `${label}：${value}` : `${label}: ${value}`;
}

function parenthetical(value: string, t: TrainingRenderT): string {
  return t.htmlLang === "zh-CN" ? `（${value}）` : `(${value})`;
}

function section(title: string, values: string[]): string {
  return `## ${title}\n${values.map((value) => `- ${value}`).join("\n")}`;
}

function subsection(title: string, values: string[]): string[] {
  return values.length > 0
    ? [`#### ${title}`, ...values.map((value) => `- ${value}`)]
    : [];
}

function stateLabel(state: TrainingState, t: TrainingRenderT): string {
  switch (state) {
    case "building":
      return t.stateBuilding;
    case "maintaining":
      return t.stateMaintaining;
    case "recovering":
      return t.stateRecovering;
    case "strained":
      return t.stateStrained;
    case "detraining":
      return t.stateDetraining;
    case "mixed":
      return t.stateMixed;
    default:
      return t.stateInsufficient;
  }
}

function readinessLabel(readiness: TrainingReadiness, t: TrainingRenderT): string {
  switch (readiness) {
    case "good":
      return t.readinessGood;
    case "moderate":
      return t.readinessModerate;
    case "low":
      return t.readinessLow;
    default:
      return t.readinessInsufficient;
  }
}

function trendLabel(
  value: InsightBundle["training"]["sports"][number]["consistency"]["frequencyTrend"],
  t: TrainingRenderT,
): string {
  if (value === "denser") return t.frequencyTrendDenser;
  if (value === "sparser") return t.frequencyTrendSparser;
  if (value === "stable") return t.frequencyTrendStable;
  return t.frequencyTrendUnknown;
}

function tagLabel(
  value: InsightBundle["training"]["sports"][number]["statusTags"][number],
  t: TrainingRenderT,
): string {
  if (value === "load rising") return t.tagLoadRising;
  if (value === "load stable") return t.tagLoadStable;
  if (value === "load falling") return t.tagLoadFalling;
  if (value === "recovery supported") return t.tagRecoverySupported;
  if (value === "recovery mixed") return t.tagRecoveryMixed;
  if (value === "recovery concern") return t.tagRecoveryConcern;
  if (value === "recovery unknown") return t.tagRecoveryUnknown;
  if (value === "consistency good") return t.tagConsistencyGood;
  return t.tagConsistencyUneven;
}

function windowLabel(id: SportWindowId, t: TrainingRenderT): string {
  switch (id) {
    case "recent30d":
      return t.recent30dLabel;
    case "baseline90d":
      return t.baseline90dLabel;
    case "trailing180d":
      return t.trailing180dLabel;
    case "trailing365d":
      return t.trailing365dLabel;
    default:
      return t.allTimeLabel;
  }
}

function getSportWindow(
  sport: TrainingSportInsight,
  id: SportWindowId,
): WorkoutTypeWindowSummary {
  if (id === "recent30d") return sport.recent30d;
  if (id === "baseline90d") return sport.baseline90d;
  if (id === "trailing180d") return sport.trailing180d;
  if (id === "trailing365d") return sport.trailing365d;
  return sport.allTime;
}

function focusWindowId(sport: TrainingSportInsight): SportWindowId {
  if (sport.recent30d.workouts >= 2 || (sport.recent30d.totalDurationMinutes ?? 0) >= 120) {
    return "recent30d";
  }
  if (sport.trailing180d.workouts >= 3 || (sport.trailing180d.totalDurationMinutes ?? 0) >= 180) {
    return "trailing180d";
  }
  if (sport.trailing365d.workouts >= 4 || sport.consistency.activeMonthsLast12 >= 2) {
    return "trailing365d";
  }
  return "allTime";
}

function metricWindowOrder(focusWindow: SportWindowId): SportWindowId[] {
  const order: SportWindowId[] = [];
  for (const windowId of [focusWindow, "recent30d", "trailing180d", "trailing365d", "allTime"] as SportWindowId[]) {
    if (!order.includes(windowId)) {
      order.push(windowId);
    }
  }
  return order;
}

function pickMetricWindow(
  sport: TrainingSportInsight,
  focusWindow: SportWindowId,
  predicate: (summary: WorkoutTypeWindowSummary) => boolean,
): { windowId: SportWindowId; summary: WorkoutTypeWindowSummary } | null {
  for (const windowId of metricWindowOrder(focusWindow)) {
    const summary = getSportWindow(sport, windowId);
    if (predicate(summary)) {
      return { windowId, summary };
    }
  }
  return null;
}

function sportSupportsDistance(sport: TrainingSportInsight): boolean {
  return DISTANCE_WORKOUT_TYPES.has(sport.type);
}

function metricLine(label: string, value: number | null, suffix: string, windowId: SportWindowId, t: TrainingRenderT): string {
  return `- ${labeled(label, `${fmt(value, suffix, t)} ${parenthetical(windowLabel(windowId, t), t)}`, t)}`;
}

function fmtSignedPct(value: number | null, t: TrainingRenderT): string {
  if (value === null) {
    return t.insufficientData;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${displayNumber(value, t)}%`;
}

function tsbLabel(tsb: number, t: TrainingRenderT): string {
  if (tsb < 0) return t.tsbBuilding;
  if (tsb > 0) return t.tsbFresh;
  return t.tsbNeutral;
}

function renderTrainingLoadMarkdownLines(load: TrainingLoadStatus | null, t: TrainingRenderT): string[] {
  if (!load) {
    return [`- ${labeled(t.cardCtl, t.insufficientData, t)}`];
  }
  const tsbSign = load.tsb > 0 ? "+" : "";
  const lines = [
    `- ${labeled(t.cardCtl, `${displayNumber(load.ctl, t)} ${t.cardCtlUnit}`, t)}`,
    `- ${labeled(t.ctlDelta30dLabel, fmtSignedPct(load.ctlDelta30dPct, t), t)}`,
    `- ${labeled(t.ctlDelta90dLabel, fmtSignedPct(load.ctlDelta90dPct, t), t)}`,
    `- ${labeled(t.cardTsb, `${tsbSign}${displayNumber(load.tsb, t)} · ${tsbLabel(load.tsb, t)}`, t)}`,
    `- ${labeled(t.cardAtl, `${displayNumber(load.atl, t)} ${t.cardCtlUnit}`, t)}`,
  ];
  if (load.warmupDays < 42) {
    lines.push(`- ${t.ctlWarmupNote(load.warmupDays)}`);
  }
  return lines;
}

function sportLoadWindowIds(sport: TrainingSportInsight): SportWindowId[] {
  const order: SportWindowId[] = [];
  for (const windowId of [
    focusWindowId(sport),
    "recent30d",
    "baseline90d",
    "trailing180d",
    "trailing365d",
    "allTime",
  ] as SportWindowId[]) {
    if (order.includes(windowId)) {
      continue;
    }
    const summary = getSportWindow(sport, windowId);
    if (windowId !== "allTime" && summary.workouts === 0 && summary.totalDurationMinutes === null) {
      continue;
    }
    order.push(windowId);
  }
  return order;
}

export function renderTrainingReportMarkdown(
  insights: InsightBundle,
  narrative: TrainingNarrativeReport,
  t: TrainingRenderT,
): string {
  const callouts = new Map(narrative.chart_callouts.map((item) => [item.chart_id, item]));
  const lines = [
    `# ${t.reportTitle}`,
    "",
    `## ${t.assessmentTitle}`,
    narrative.training_assessment,
    "",
    `- ${labeled(t.cardTrainingState, stateLabel(insights.training.summary.trainingState, t), t)}`,
    `- ${labeled(t.cardReadiness, readinessLabel(insights.training.summary.readiness, t), t)}`,
    `- ${labeled(
      t.cardRecentLoad,
      t.cardRecentLoadSub(
        insights.training.summary.recent30dWorkouts,
        fmt(insights.training.summary.recent30dDurationMinutes, t.unitMinutes, t),
      ),
      t,
    )}`,
    `- ${labeled(t.cardPrimarySport, insights.training.summary.primarySportLabel ?? t.insufficientData, t)}`,
    "",
    section(t.overallFindingsTitle, narrative.overall_findings),
    "",
    `## ${t.loadRecoveryTitle}`,
    ...renderTrainingLoadMarkdownLines(insights.training.summary.trainingLoad, t),
    `- ${labeled(`${t.workoutsLabel} ${t.vsBaseline}`, fmt(insights.training.summary.loadTrend.recentVsBaseline90d.workoutsPer30d, "", t), t)}`,
    `- ${labeled(`${t.durationLabel} ${t.vsBaseline}`, fmt(insights.training.summary.loadTrend.recentVsBaseline90d.durationMinutesPer30d, t.unitMinutes, t), t)}`,
    `- ${labeled(`${t.activeEnergyLabel} ${t.vsBaseline}`, fmt(insights.training.summary.loadTrend.recentVsBaseline90d.activeEnergyBurnedKcalPer30d, t.unitKcal, t), t)}`,
    `- ${labeled(t.varietyLabel, `${insights.training.summary.loadTrend.recentWorkoutVariety} ${parenthetical(`${t.vsBaseline} ${insights.training.summary.loadTrend.recentVsBaselineVariety > 0 ? "+" : ""}${insights.training.summary.loadTrend.recentVsBaselineVariety}`, t)}`, t)}`,
    `- ${labeled(t.recoverySupportTitle, insights.training.summary.recoverySupport.adequate === true ? t.supportAdequate : insights.training.summary.recoverySupport.adequate === false ? t.supportInadequate : t.supportUnknown, t)}`,
    `- ${labeled(t.sleepVsBaselineLabel, fmt(insights.training.summary.recoverySupport.sleepDeltaHours, t.unitHours, t), t)}`,
    `- ${labeled(t.hrvVsBaselineLabel, fmt(insights.training.summary.recoverySupport.hrvDeltaPct, "%", t), t)}`,
    `- ${labeled(t.restingHeartRateVsBaselineLabel, fmt(insights.training.summary.recoverySupport.restingHeartRateDeltaBpm, t.unitBpm, t), t)}`,
    "",
    `## ${t.sportsTitle}`,
  ];

  if (insights.training.sports.length === 0) {
    lines.push(`- ${t.noSportData}`);
  } else {
    for (const sport of insights.training.sports) {
      const sectionNarrative = narrative.sport_sections.find((entry) => entry.sport_id === sport.id);
      const focusWindow = focusWindowId(sport);
      const focusSummary = getSportWindow(sport, focusWindow);
      const loadWindows = sportLoadWindowIds(sport);
      const heartRateMetric = pickMetricWindow(
        sport,
        focusWindow,
        (summary) =>
          summary.averageHeartRateBpm !== null &&
          (summary.heartRateCoveragePct ?? 0) >= 60 &&
          summary.workouts >= 3,
      );
      const distanceMetric = sportSupportsDistance(sport)
        ? pickMetricWindow(
            sport,
            focusWindow,
            (summary) =>
              summary.totalDistanceKm !== null &&
              (summary.distanceCoveragePct ?? 0) >= 60 &&
              summary.workouts >= 1,
          )
        : null;
      const metsMetric = pickMetricWindow(
        sport,
        focusWindow,
        (summary) =>
          summary.averageMETs !== null &&
          (summary.metsCoveragePct ?? 0) >= 60 &&
          summary.workouts >= 1,
      );

      lines.push(`### ${sport.label}`);
      lines.push(`- ${labeled(t.focusWindowLabel, windowLabel(focusWindow, t), t)}`);
      for (const windowId of loadWindows) {
        const summary = getSportWindow(sport, windowId);
        lines.push(`- ${labeled(windowLabel(windowId, t), `${summary.workouts} / ${fmt(summary.totalDurationMinutes, t.unitMinutes, t)}`, t)}`);
      }
      lines.push(`- ${labeled(t.activeEnergyLabel, `${fmt(focusSummary.totalActiveEnergyBurnedKcal, t.unitKcal, t)} ${parenthetical(windowLabel(focusWindow, t), t)}`, t)}`);
      if (heartRateMetric) {
        lines.push(metricLine(t.avgHeartRateLabel, heartRateMetric.summary.averageHeartRateBpm, t.unitBpm, heartRateMetric.windowId, t));
      }
      if (distanceMetric) {
        lines.push(metricLine(t.distanceLabel, distanceMetric.summary.totalDistanceKm, t.unitKm, distanceMetric.windowId, t));
      }
      if (metsMetric) {
        lines.push(metricLine(t.avgMetsLabel, metsMetric.summary.averageMETs, "", metsMetric.windowId, t));
      }
      if (sport.recoveryAfterWorkout.sampleCount > 0) {
        lines.push(`- ${labeled(t.recoverySampleCountLabel, fmt(sport.recoveryAfterWorkout.sampleCount, "", t), t)}`);
        lines.push(`- ${labeled(t.recoveryComparisonLabel, t.recoveryComparisonValue, t)}`);
        lines.push(`- ${labeled(`${t.nextDaySleepDeltaLabel} ${parenthetical(t.comparisonSampleCountNote(sport.recoveryAfterWorkout.sleepSampleCount, sport.recoveryAfterWorkout.sleepComparatorSampleCount), t)}`, fmt(sport.recoveryAfterWorkout.nextDaySleepHoursDelta, t.unitHours, t), t)}`);
        lines.push(`- ${labeled(`${t.nextDayHrvDeltaLabel} ${parenthetical(t.comparisonSampleCountNote(sport.recoveryAfterWorkout.hrvSampleCount, sport.recoveryAfterWorkout.hrvComparatorSampleCount), t)}`, fmt(sport.recoveryAfterWorkout.nextDayHrvDelta, t.unitMilliseconds, t), t)}`);
        lines.push(`- ${labeled(`${t.nextDayRestingHrDeltaLabel} ${parenthetical(t.comparisonSampleCountNote(sport.recoveryAfterWorkout.restingHeartRateSampleCount, sport.recoveryAfterWorkout.restingHeartRateComparatorSampleCount), t)}`, fmt(sport.recoveryAfterWorkout.nextDayRestingHeartRateDelta, t.unitBpm, t), t)}`);
      }
      lines.push(`- ${labeled(t.longestGapLabel, fmt(sport.consistency.longestGapDays, t.unitDays, t), t)}`);
      lines.push(`- ${labeled(t.activeMonthsLast12Label, fmt(sport.consistency.activeMonthsLast12, "", t), t)}`);
      lines.push(`- ${labeled(t.statusTagsLabel, sport.statusTags.map((tag) => tagLabel(tag, t)).join(" | "), t)}`);
      lines.push(`- ${labeled(t.consistencyTrendLabel, trendLabel(sport.consistency.frequencyTrend, t), t)}`);
      if (sectionNarrative) {
        lines.push(sectionNarrative.assessment);
        lines.push(...subsection(sectionNarrative.title, sectionNarrative.key_signals));
        lines.push(...subsection(t.sportRecommendationsTitle, sectionNarrative.recommendations));
      }
      lines.push("");
    }
  }

  lines.push(section(t.watchoutsTitle, narrative.watchouts));
  lines.push("");
  lines.push(section(t.actionsTitle, narrative.actions_next_2_weeks));
  lines.push("");
  lines.push(section(t.doctorQuestionsTitle, narrative.questions_for_doctor));
  lines.push("");
  lines.push(`## ${t.chartSectionTitle}`);
  lines.push(
    ...insights.training.charts.map((chart) => `- ${labeled(chart.title, callouts.get(chart.id)?.summary ?? t.chartCalloutFallback, t)}`),
  );
  lines.push("");
  lines.push(section(t.appendixTitle, narrative.data_limitations));
  lines.push("");
  lines.push(`## ${t.disclaimerTitle}`);
  lines.push(narrative.disclaimer);
  lines.push("");

  return `${lines.join("\n")}\n`;
}
