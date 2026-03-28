// ── Render layer translations (English) ──────────────────────────────
import type { RenderT } from "../zh/render.js";

export const renderEn: RenderT = {
  // ── HTML meta ─────────────────────────────────────────────────────
  htmlLang: "en",
  locale: "en-US",
  reportTitle: "Apple Health Report",

  // ── Shared helpers ────────────────────────────────────────────────
  insufficientData: "Insufficient data",
  dash: "—",

  // ── Confidence labels ─────────────────────────────────────────────
  confidenceHigh: "Sufficient",
  confidenceMedium: "Moderate",
  confidenceLow: "Insufficient",

  // ── Recovery table inline labels ──────────────────────────────────
  recentSamplesInsufficient: "Insufficient recent samples",
  sparkBaseline: "Baseline",
  sparkRecent: "Recent",
  sparkLatest: "Latest",
  coverageDays: (days: number) => `${days}-day coverage`,

  // ── Callout fallbacks ─────────────────────────────────────────────
  sleepCalloutFallback: "The sleep module is best viewed for trend direction and continuity.",
  recoveryCalloutFallback: "Recovery metrics are best observed as a group.",
  activityCalloutFallback: "The activity module shows both daily activity and training rhythm.",
  bodyCalloutFallback: "Body composition is best viewed at the monthly direction level.",

  // ── Navigation ────────────────────────────────────────────────────
  navAssessment: "Assessment",
  navInsights: "Insights",
  navSleep: "Sleep",
  navRecovery: "Recovery",
  navActivity: "Activity",
  navBody: "Body",
  navMenstrual: "Menstrual",
  navAppendix: "Appendix",

  // ── Summary cards ─────────────────────────────────────────────────
  cardSleepAvg: "Sleep Avg",
  cardRestingHr: "Resting HR",
  cardRiskSignals: "Risk Signals",
  cardRiskNeedsAttention: "Needs attention",
  cardRiskNoAbnormal: "No abnormalities",
  cardDataGaps: "Data Gaps",
  cardDataGapsAffectsConfidence: "Affects confidence",
  cardDataGapsCoverageGood: "Good coverage",
  cardRecent30d: "Last 30 days",

  // ── Assessment section ────────────────────────────────────────────
  assessmentTitle: "Health Assessment",
  overallStatusLabel: "Overall: ",
  readinessGood: "Good",
  readinessModerate: "Moderate",
  readinessLow: "Low",
  scoreSleep: "Sleep",
  scoreRecovery: "Recovery",
  scoreActivity: "Activity",

  // ── Insights section ──────────────────────────────────────────────
  insightsSectionTitle: "Correlation Analysis",
  crossMetricTitle: "Cross-Metric Findings",
  behavioralPatternsTitle: "Behavioural Patterns",

  // ── Overview / Findings ───────────────────────────────────────────
  overviewTitle: "Overview",
  keyFindings: "Key Findings",

  // ── Module headers ────────────────────────────────────────────────
  sleepModuleTitle: "Sleep",
  recoveryModuleTitle: "Recovery",
  activityModuleTitle: "Activity & Training",
  bodyModuleTitle: "Body Composition",
  dataPrefix: "Data: ",

  // ── Sleep module aside ────────────────────────────────────────────
  sleepRecent30dLabel: "30-Day Sleep",
  sleepRecent30dAwakeLabel: "30-Day Awake",
  sleepBedtimeWakeLabel: "Median Bedtime / Wake",
  sleepRecentNote: "Recent",
  meanNote: "Average",

  // ── Sleep legend ──────────────────────────────────────────────────
  legendSleepDuration: "Sleep Duration",
  legendDeepPct: "Deep Sleep %",
  legendRemPct: "REM %",

  // ── Heading labels for note blocks ────────────────────────────────
  normalRangeAssessment: "Normal Range Assessment",
  healthAdvice: "Health Advice",
  doctorQuestions: "Questions for Your Doctor",
  sourceCoverage: "Source & Coverage",

  // ── Recovery table headers ────────────────────────────────────────
  thMetric: "Metric",
  thLatest: "Latest",
  thRecent30d: "30 Days",
  thBaseline: "Baseline",
  thDelta: "Change",
  thTrend: "Trend",

  // ── Recovery row labels ───────────────────────────────────────────
  rowRestingHr: "Resting HR",
  rowHrv: "HRV",
  rowOxygen: "Blood Oxygen",
  rowRespiratoryRate: "Respiratory Rate",
  rowVo2Max: "VO2 Max",

  // ── Activity section ──────────────────────────────────────────────
  legendActivityEnergy: "Active Energy",
  legendExerciseMin: "Exercise Min",
  legendStandHours: "Stand Hours",
  activityEnergyRecent: "30-Day Active Energy",
  activityExerciseRecent: "30-Day Exercise",
  activityStandRecent: "30-Day Stand",
  whoAssessment: "WHO Benchmark Assessment",

  // ── Body composition ──────────────────────────────────────────────
  bodyDataInsufficient: "Insufficient body composition data.",

  // ── Menstrual cycle ───────────────────────────────────────────────
  legendCycleLength: "Cycle Length",
  legendPeriodDuration: "Period Duration",
  menstrualAvgCycleLabel: "Average Cycle",
  menstrualAvgPeriodLabel: "Average Period",
  menstrualCycleTrendLabel: "Cycle Trend",
  menstrualTrendLengthening: "Lengthening",
  menstrualTrendShortening: "Shortening",
  menstrualTrendStable: "Stable",
  menstrualBleedingPatternTitle: "Bleeding Pattern Analysis",
  menstrualCycleCount: (count: number) => `${count} cycles`,

  // ── Actions ───────────────────────────────────────────────────────
  actionsNext2Weeks: "Recommendations for the Next 2 Weeks",
  actionsSeekCare: "When to Seek Medical Attention",
  actionsDoctorQuestions: "Questions for Your Next Doctor Visit",

  // ── Appendix ──────────────────────────────────────────────────────
  appendixTitle: "Data Boundaries & Notes",
  appendixDataLimitations: "Data Limitations",
  appendixSourceConfidence: "Source Confidence",

  // ── Date range display ────────────────────────────────────────────
  windowStart: "Start",

  // ── Chart aria labels (chartSvg.ts) ───────────────────────────────
  sparklineAriaLabel: (label: string) => `${label} sparkline`,
  barChartAriaLabel: (label: string) => `${label} bar chart`,
  lineChartAriaLabel: "Trend chart",

  // ── Markdown-specific strings ─────────────────────────────────────
  mdReportTitle: "Apple Health Report",
  mdAssessmentTitle: "Health Assessment",
  mdCompositeScore: "Composite Score",
  mdOverallStatus: "Overall Status",
  mdCrossMetricTitle: "Cross-Metric Correlation Analysis",
  mdBehavioralPatterns: "Behavioural Patterns",
  mdOverviewTitle: "Overview",
  mdKeyFindings: "Key Findings",
  mdStrengths: "Strengths",
  mdWatchouts: "Watch Out For",
  mdActionsNext2Weeks: "Recommendations for the Next 2 Weeks",
  mdSeekCare: "When to Seek Medical Attention",
  mdDoctorQuestions: "Questions for Your Next Doctor Visit",
  mdDataLimitations: "Data Limitations",
  mdDataRangeTitle: "Data Range",
  mdExportDate: "Export date",
  mdExportDateUnknown: "Unknown",
  mdAnalysisWindow: "Analysis window",
  mdRecordCount: "Record count",
  mdWorkoutCount: "Workout count",
  mdActivitySummaryCount: "Activity summary count",
  mdPrimarySourcesTitle: "Primary Data Sources",
  mdPrimarySleep: "Sleep",
  mdPrimaryRecovery: "Recovery",
  mdPrimaryBody: "Body Composition",
  mdPrimaryActivity: "Activity",
  mdPrimarySeparator: ", ",
  mdRiskSignalsTitle: "Confirmed Signals",
  mdChartInterpretationTitle: "Chart Interpretation",
  mdChartCurrentValue: (value: string) => `Current primary series latest value: ${value}.`,
  mdHistoricalTitle: "Long-Term Historical Reference",
  mdHistoricalSpan: (days: number, earliest: string, latest: string) =>
    `Historical span: ~${days} days (${earliest} -> ${latest})`,
  mdHistoricalSleep: (recent: string, trailing: string, allTime: string) =>
    `Sleep: last 30 days ${recent}, last 180 days ${trailing}, all-time ${allTime}`,
  mdHistoricalRecovery: (rhrRecent: string, rhrAll: string, hrvRecent: string, hrvAll: string) =>
    `Recovery: resting HR last 30 days ${rhrRecent}, all-time ${rhrAll}; HRV last 30 days ${hrvRecent}, all-time ${hrvAll}`,
  mdHistoricalActivity: (recent: string, trailing: string, allTime: string) =>
    `Activity: last 30 days exercise ${recent}, last 180 days ${trailing}, all-time ${allTime}`,
  mdHistoricalBody: (weightRecent: string, weightAll: string, fatRecent: string, fatAll: string) =>
    `Body composition: weight last 30 days ${weightRecent}, all-time ${weightAll}; body fat last 30 days ${fatRecent}, all-time ${fatAll}`,
  mdInterpretationHintPrefix: "Interpretation hint: ",
  mdStructuredFactsTitle: "Structured Facts Snapshot",
  mdFactSleep: (recent: string, baseline: string, delta: string) =>
    `Sleep: last 30 days ${recent}, baseline ${baseline}, change ${delta}`,
  mdFactRecovery: (rhr: string, hrv: string) =>
    `Recovery: resting HR ${rhr}, HRV ${hrv}`,
  mdFactActivity: (exercise: string, workouts: number) =>
    `Activity: last 30 days exercise ${exercise}, ${workouts} workouts`,
  mdFactBody: (weight: string, fat: string) =>
    `Body composition: weight ${weight}, body fat ${fat}`,
  mdFactSleepInterpretation: "Sleep interpretation: ",
  mdFactSleepNormalRange: "Sleep normal range: ",
  mdFactRecoveryInterpretation: "Recovery interpretation: ",
  mdFactRecoveryNormalRange: "Recovery normal range: ",
  mdFactActivityInterpretation: "Activity interpretation: ",
  mdFactActivityNormalRange: "Activity normal range: ",
  mdFactMenstrualCycle: (avg: string, period: string, total: number) =>
    `Menstrual cycle: average ${avg}, period ${period}, ${total} cycles total`,
  mdFactMenstrualInterpretation: "Menstrual cycle interpretation: ",
  mdFactMenstrualNormalRange: "Normal range assessment: ",
  mdDisclaimerTitle: "Disclaimer",

  // ── Score labels (markdown) ───────────────────────────────────────
  mdScoreSleep: (score: number) => `Sleep ${score}/100`,
  mdScoreRecovery: (score: number) => `Recovery ${score}/100`,
  mdScoreActivity: (score: number) => `Activity ${score}/100`,

  // ── Unit suffixes ────────────────────────────────────────────────
  unitHours: " hrs",
  unitMinutes: " min",
  unitDays: " days",

  // ── Footer ────────────────────────────────────────────────────────
  footerTagline: "Privacy-first Apple Health analytics",
};
