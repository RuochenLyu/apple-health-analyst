import type { TrainingInsightsT } from "../zh/trainingInsights.js";

export const trainingInsightsEn: TrainingInsightsT = {
  trainingLoadChartTitle: "Training Load Trend (42-day baseline · 7-day recent · load balance)",
  trainingLoadChartSubtitle:
    "Load is estimated in MET-minutes: CTL is the 42-day EWMA baseline, ATL is the 7-day recent-load EWMA, and TSB = CTL − ATL. The balance compares recent with longer-term personal load; it does not independently measure fatigue or readiness.",
  ctlSeriesLabel: "42-day Load Baseline (CTL)",
  atlSeriesLabel: "7-day Recent Load (ATL)",
  tsbSeriesLabel: "Load Balance (TSB)",
  trainingRecoveryChartTitle: "Training Duration and Recovery Context Index",
  trainingRecoveryChartSubtitle:
    "Each series is indexed so 100 equals its average across recorded months in the last 12 months; values above 100 are above that series' recorded personal norm.",
  trainingLoadIndexLabel: "Training Duration Index",
  sleepSupportIndexLabel: "Sleep Support Index",
  hrvSupportIndexLabel: "HRV Support Index",
  restingHeartRateSupportIndexLabel: "Resting HR Support Index",
  sportTrendChartTitle: (sport) => `${sport} Monthly Rhythm`,
  sportTrendChartSubtitle: "Bars = monthly workout count (left axis); line = average duration per workout (right axis). Two orthogonal dimensions — how often and how long — together describe the rhythm better than either alone.",
  workoutCountLabel: "Monthly Workouts",
  avgWorkoutDurationLabel: "Avg Duration per Workout",
  chartUnitSessions: "sessions",
  chartUnitMinutes: "min",
  chartUnitIndex: "index",
  chartUnitMetMinutes: "MET·min",
  metadataLanguage: "en",
  outputSchemaVersion: "2.0.0",
  narrativeAudience: "general users",
  narrativeGoal:
    "Use Apple Health workout, sleep, and recovery data to produce an English training-status report focused on activity rhythm, load changes, and recovery evidence.",
  narrativeBoundaries: [
    "Only cite facts from summary.json and insights.json",
    "Prioritize training rhythm, load changes, activity-specific status, and recovery evidence",
    "You may give training-adjustment and health-management advice, but not competitive prescriptions or diagnoses",
    "Do not fabricate Garmin-style proprietary scores that Apple Health cannot robustly reproduce",
    "Use conservative follow-up or medical reminders when signals look persistently abnormal",
  ],
};
