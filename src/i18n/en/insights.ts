// ── Insight builder translations (English) ──────────────────────────
import type { InsightsT } from "../zh/insights.js";

export const insightsEn: InsightsT = {
  // ── Metric labels ─────────────────────────────────────────────────
  restingHeartRateLabel: "Resting Heart Rate",
  hrvLabel: "HRV",
  oxygenSaturationLabel: "Blood Oxygen",
  respiratoryRateLabel: "Respiratory Rate",
  vo2MaxLabel: "VO2 Max",
  bodyMassLabel: "Weight",
  bodyFatPercentageLabel: "Body Fat %",

  // ── Chart titles & subtitles ──────────────────────────────────────
  sleepChartTitle: "Sleep Duration & Stage Trends",
  sleepChartSubtitle:
    "Charts use one daily, weekly, or monthly granularity for the full time span to avoid crowding mixed time scales.",
  recoveryChartTitle: "Recovery Metrics Comparison",
  recoveryChartSubtitle:
    "Each recovery metric retains its native unit for per-metric curve and latest-value display.",
  activityChartTitle: "Activity Trends",
  activityChartSubtitle:
    "Activity summaries track daily movement; workouts counted separately to avoid mixing sources.",
  bodyChartTitle: "Body Composition Trends",
  bodyChartSubtitle:
    "Prioritizes the most consistent scale source; recent changes map directly to weight and body-fat curves.",
  menstrualChartTitle: "Menstrual Cycle Trends",
  menstrualChartSubtitleWithAvg: (periods: number, avgDays: number) =>
    `Tracked ${periods} cycles, average cycle length ${avgDays} days.`,
  menstrualChartSubtitleNoAvg: (periods: number) =>
    `Tracked ${periods} periods.`,

  // ── Chart series labels ───────────────────────────────────────────
  sleepHoursLabel: "Sleep Duration",
  sleepHoursUnit: "hours",
  deepSleepPctLabel: "Deep Sleep %",
  remSleepPctLabel: "REM %",
  activityEnergyLabel: "Active Energy",
  exerciseMinutesLabel: "Exercise Minutes",
  exerciseMinutesUnit: "min",
  standHoursLabel: "Stand Hours",
  standHoursUnit: "hours",
  workoutCountLabel: "Workouts",
  workoutCountUnit: "sessions",
  cycleLengthLabel: "Cycle Length",
  cycleLengthUnit: "days",
  periodDurationLabel: "Period Duration",
  periodDurationUnit: "days",

  // ── Source confidence summaries ───────────────────────────────────
  sleepConfidenceSummary: (source: string, days: number, staged: boolean) =>
    `Primary sleep source: ${source}, covering ${days} ${days === 1 ? "night" : "nights"} in the last 30 days${staged ? ", with staged sleep data" : ""}.`,
  sleepConfidenceInsufficient: "Insufficient sleep data; trend interpretation has lower confidence.",
  recoveryConfidenceSummary: (recentCount: number, totalCount: number, sources: string) =>
    `${recentCount} of ${totalCount} selected recovery ${totalCount === 1 ? "metric has" : "metrics have"} records in the last 30 days, primarily from ${sources}.`,
  recoveryConfidenceInsufficient: "Insufficient recovery metric coverage; unable to assess recovery trends.",
  activityConfidenceSummary: (days: number, workouts: number) =>
    `Activity summaries are present on ${days} ${days === 1 ? "day" : "days"} in the last 30 days, with ${workouts} ${workouts === 1 ? "workout" : "workouts"}.`,
  activityConfidenceInsufficient: "Insufficient activity summaries or workout records; activity trends should be interpreted cautiously.",
  bodyConfidenceSummary: (recentCount: number, totalCount: number, sources: string) =>
    `${recentCount} of ${totalCount} selected body-composition ${totalCount === 1 ? "metric has" : "metrics have"} records in the last 30 days, from ${sources}.`,
  bodyConfidenceDefaultSource: "selected primary source",
  bodyConfidenceInsufficient: "Insufficient body composition samples; focus on direction rather than minor fluctuations.",
  menstrualConfidenceSummary: (periods: number, days: number) =>
    `Menstrual cycle data covers ${periods} ${periods === 1 ? "cycle" : "cycles"}, ${days} ${days === 1 ? "day" : "days"} of records.`,

  // ── Data gaps ─────────────────────────────────────────────────────
  sleepInsufficientGap: "Limited number of sleep nights; recent vs baseline comparison has limited stability.",
  sleepPartialNightsGap: (count: number) =>
    `${count} sleep ${count === 1 ? "night" : "nights"} excluded due to incomplete records.`,
  recoveryMetricMissingGap: (label: string) =>
    `${label} lacks sufficient recent samples.`,
  activitySparseGap: "Recent activity summary coverage is limited; activity trends are best viewed directionally.",
  bodyMetricMissingGap: (label: string) =>
    `${label} lacks sufficient recent samples.`,
  menstrualSparseGap: "Limited menstrual cycle records; regularity assessment has lower confidence.",

  // ── Risk flag titles ──────────────────────────────────────────────
  sleepDeclineTitle: "Recent Sleep Duration Decline",
  sleepDeclineSummary:
    "30-day average sleep duration is notably below personal baseline; review sleep schedule and recovery routines.",
  sleepDeclineEvidence: (recent: string, baseline: string) => [
    `30-day average: ${recent} hours`,
    `90-day baseline average: ${baseline} hours`,
  ],
  sleepDeclineRecommendation: "Stabilize your sleep window and wake time before increasing training load.",

  recoveryStressTitle: "Recovery Signals Tightening",
  recoveryStressSummary:
    "Resting heart rate is rising while HRV is declining, directionally consistent with greater recent strain or weaker recovery support; device data alone cannot identify the cause.",
  recoveryStressEvidence: (hrDelta: string, hrvDelta: string) => [
    `Resting heart rate change: ${hrDelta}`,
    `HRV change: ${hrvDelta}`,
  ],
  recoveryStressRecommendation:
    "Use fatigue, pain, and the training plan to decide whether to reduce high-intensity work temporarily; prioritize sleep and hydration, then monitor the trend.",

  oxygenLowTitle: "Low Blood Oxygen Reading",
  oxygenLowSummary:
    "The 30-day average across multiple device SpO2 readings is low; verify fit and measurement conditions and watch for symptoms.",
  oxygenLowEvidence: (value: string) => [`30-day average SpO2: ${value}`],
  oxygenLowRecommendation:
    "Re-test and check device placement; if persistently low or symptomatic, consult a doctor promptly.",

  activityDropTitle: "Recent Activity Drop",
  activityDropSummary:
    "Recorded exercise minutes have notably declined from baseline; the available data cannot identify the cause or its effect on fitness.",
  activityDropEvidence: (recent: string, baseline: string) => [
    `30-day average exercise: ${recent} min`,
    `90-day baseline average: ${baseline} min`,
  ],
  activityDropRecommendation: "Focus on restoring a regular activity rhythm rather than compensating in a single session.",

  bodyMassShiftTitle: "Rapid Weight Change",
  bodyMassShiftSummary:
    "Weight has shifted rapidly relative to personal baseline over the last 30 days; consider diet, training load, and subjective state.",
  bodyMassShiftEvidence: (delta: string) => [`Weight change: ${delta}`],
  bodyMassShiftRecommendation:
    "Confirm whether the change is expected, then factor in body fat, activity, and recovery signals.",

  bodyFatShiftTitle: "Body Fat % Warrants Review",
  bodyFatShiftSummary:
    "Body fat percentage change is large enough to warrant attention, especially considering measurement timing and device consistency.",
  bodyFatShiftEvidence: (delta: string) => [`Body fat change: ${delta}`],
  bodyFatShiftRecommendation:
    "Re-test under consistent conditions to avoid misinterpreting short-term fluctuations as stable trends.",

  menstrualIrregularTitle: "High Menstrual Cycle Variability",
  menstrualIrregularSummary:
    "Recent recorded cycle variability is high. Routine, stress, nutrition, and many health factors may be related, but the records cannot identify a cause.",
  menstrualIrregularEvidence: (std: string, avg: string) => [
    `Cycle length std dev: ${std} days`,
    `Average cycle: ${avg} days`,
  ],
  menstrualIrregularRecommendation:
    "Continue tracking cycles and symptoms; seek gynecological advice if variability persists, you are trying to conceive, or symptoms occur.",

  menstrualCycleLengthAbnormalTitle: "Menstrual Cycle Outside Reference Range",
  menstrualCycleLengthAbnormalSummary: (avg: number) =>
    `Average cycle length is ${avg} days, outside the common reference range used by this report (21-38 days); this is not a diagnosis.`,
  menstrualCycleLengthAbnormalEvidence: (avg: number) => [
    `Average cycle: ${avg} days`,
  ],
  menstrualCycleLengthAbnormalRecommendation:
    "If it remains outside your baseline, you are trying to conceive, or symptoms occur, seek gynecological advice so a clinician can decide whether evaluation is needed.",

  intermenstrualBleedingTitle: "Frequent Intermenstrual Bleeding",
  intermenstrualBleedingSummary:
    "Intermenstrual bleeding is frequent in the available records; watch whether it repeats, becomes heavier, or occurs with symptoms.",
  intermenstrualBleedingEvidence: (count: number, freq: number) => [
    `Intermenstrual bleeding: ${count} times`,
    `Average per cycle: ${freq} times`,
  ],
  intermenstrualBleedingRecommendation:
    "If intermenstrual bleeding persists, becomes heavier, or occurs with pain, consult a gynecologist.",

  // ── Notable changes ───────────────────────────────────────────────
  sleepImprovedTitle: "Sleep Duration Recovered Above Baseline",
  sleepImprovedSummary: "30-day average sleep duration exceeds baseline; whether recovery has improved also depends on regularity, daytime function, and other indicators.",
  sleepImprovedEvidence: (delta: string, latest: string) => [
    `Sleep change: ${delta} hours`,
    `Latest sleep curve end: ~${latest} hours`,
  ],

  restingHrImprovedTitle: "Resting Heart Rate Below Baseline",
  restingHrImprovedSummary:
    "Resting heart rate is lower than personal baseline, directionally consistent with improved recent recovery signals; interpret it alongside how you feel and other metrics.",
  restingHrImprovedEvidence: (delta: string) => [
    `Resting heart rate change: ${delta}`,
  ],

  hrvImprovedTitle: "HRV Above Baseline",
  hrvImprovedSummary: "HRV is above baseline, directionally consistent with improved recent recovery signals; one metric cannot identify the cause.",
  hrvImprovedEvidence: (delta: string) => [`HRV change: ${delta}`],

  hrvDeclinedTitle: "HRV Below Baseline",
  hrvDeclinedSummary: "HRV has fallen below recent personal baseline; recovery burden warrants attention.",
  hrvDeclinedEvidence: (delta: string) => [`HRV change: ${delta}`],

  activityUpTitle: "Recent Training Volume Increasing",
  activityUpSummary: "Exercise minutes exceed baseline; recent training adherence is stronger.",
  activityUpEvidence: (delta: string) => [`Exercise minute change: ${delta} min`],

  bodyMassDownTitle: "Weight Trending Down",
  bodyMassDownSummary:
    "30-day weight is below baseline; assess whether this aligns with activity levels and subjective state.",
  bodyMassDownEvidence: (delta: string, latest: string) => [
    `Weight change: ${delta}`,
    `Latest weight: ~${latest}`,
  ],

  menstrualRegularTitle: "Regular Menstrual Cycle",
  menstrualRegularSummary: (avg: number, std: number) =>
    `Average cycle ${avg} days, std dev ${std} days — cycle is stable.`,
  menstrualRegularEvidence: (periods: number, std: number) => [
    `${periods} cycles total`,
    `Std dev: ${std} days`,
  ],

  menstrualCycleShiftTitle: "Menstrual Cycle Length Shift",
  menstrualCycleShiftSummary: (recent: number, historical: number, delta: string) =>
    `Last 90 days average cycle ${recent} days, historical average ${historical} days, change ${delta} days.`,
  menstrualCycleShiftEvidence: (recent: number, historical: number) => [
    `Last 90 days average: ${recent} days`,
    `Historical average: ${historical} days`,
  ],

  // ── Interpretation hints ──────────────────────────────────────────
  hintSleepBelowLongTerm: (diff: number) =>
    `Recent sleep duration is ${diff} hours below the long-term average; this should take priority over increasing training volume.`,
  hintSleepAboveLongTerm: (diff: number) =>
    `Recent sleep duration is ${diff} hours above the long-term average, so more time has recently been recorded as sleep; assess recovery quality with other indicators.`,
  hintRecoveryStress:
    "Resting heart rate above long-term average and HRV below — commonly seen with elevated recovery load, rising stress, or recent rhythm disruption.",
  hintRecoveryRelaxed:
    "Recovery metrics are directionally more favorable than long-term averages, but device metrics alone cannot establish whether sleep, stress, or training is sustainable.",
  hintSleepImprovedRecoveryLagging:
    "Sleep improvement has appeared first, but recovery metrics have not yet followed — better to maintain rhythm rather than increase volume immediately.",
  hintActivityUpWeightDown:
    "Activity above long-term average and weight below — if this is intentional, the direction is consistent; if not, watch intake and recovery.",
  hintActivityDownWeightUp:
    "Recent activity below long-term average while weight is above — better to restore stable activity and routines before pursuing intensity.",
  hintActivityUpRecoveryOk:
    "Recent activity is above the long-term average and current device metrics show no clear recovery deterioration; this does not confirm that the load is tolerable, so also consider fatigue, pain, and perceived effort.",
  hintWeightDownActivityFlat:
    "Weight below long-term average but activity increase is not obvious; if this is not an intentional fat-loss goal, review diet, sleep, and recovery together.",
  hintSparseModules:
    "Historical span is long enough, but some recent module records are sparse; recent judgments should prioritize modules with more continuous records.",
  hintMenstrualRegular: (avg: number, std: number) =>
    `Recorded menstrual cycles are relatively regular (average ${avg} days, std dev ${std} days); this describes the recorded pattern and is not an assessment of hormone status.`,
  hintMenstrualIrregular: (std: number) =>
    `Menstrual cycle is irregular (std dev ${std} days); consider sleep and stress data together, and consult a gynecologist if needed.`,

  // ── Narrative context ─────────────────────────────────────────────
  narrativeAudience: "general user",
  narrativeGoal:
    "Combine the last 30 days, past 180 days, and full available history to generate an English health management report — no diagnoses.",
  narrativeBoundaries: [
    "Only reference facts from summary.json and insights.json",
    "May provide health management advice on sleep, recovery, activity, and body composition",
    "Prioritize historicalContext across 30-day, 180-day, and all-time windows — do not rely on a single window",
    "Do not generate medical diagnoses, disease assessments, or treatment plans",
    "When clear anomalies are present, a conservative follow-up or medical consultation reminder is acceptable",
  ],

  // ── Activity source ───────────────────────────────────────────────
  activitySource: "Activity Summaries + Workout Records",

  // ── Metadata ──────────────────────────────────────────────────────
  metadataLanguage: "en",
};
