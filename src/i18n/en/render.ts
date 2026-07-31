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
  navAssessment: "Data Summary",
  navInsights: "Insights",
  navActions: "Actions",
  navSleep: "Sleep",
  navRecovery: "Recovery",
  navActivity: "Activity",
  navBody: "Body",
  navMenstrual: "Menstrual",
  navAppendix: "Appendix",
  skipToContent: "Skip to report content",
  reportSectionsLabel: "Report sections",

  // ── Summary cards ─────────────────────────────────────────────────
  cardSleepAvg: "Sleep Avg",
  cardRestingHr: "Resting HR",
  cardRiskSignals: "Risk Signals",
  cardRiskNeedsAttention: "Needs attention",
  cardRiskNoAbnormal: "No rule triggered",
  cardDataGaps: "Data Gaps",
  cardDataGapsAffectsConfidence: "Affects confidence",
  cardDataGapsCoverageGood: "No major gap found",
  cardRecent30d: "Last 30 days",

  // ── Assessment section ────────────────────────────────────────────
  assessmentTitle: "Recent Data Summary",
  overallStatusLabel: "Data signal: ",
  readinessGood: "Relatively stable",
  readinessModerate: "Mixed",
  readinessLow: "Needs attention",
  scoreSleep: "Sleep",
  scoreRecovery: "Recovery",
  scoreActivity: "Activity",

  // ── Insights section ──────────────────────────────────────────────
  insightsSectionTitle: "Multi-Metric Patterns",
  crossMetricTitle: "Cross-Metric Findings",
  behavioralPatternsTitle: "Behavioral Patterns",
  evidenceDetailsTitle: "Explore Cross-Metric Evidence",

  // ── Overview / Findings ───────────────────────────────────────────
  overviewTitle: "Overview",
  keyFindings: "Key Findings",
  strengthsTitle: "What Is Working",
  watchoutsTitle: "Watch Closely",

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
  normalRangeAssessment: "Reference Context",
  healthAdvice: "Practical Next Steps",
  doctorQuestions: "Questions for Your Doctor",
  sourceCoverage: "Source & Coverage",

  // ── Recovery table headers ────────────────────────────────────────
  thMetric: "Metric",
  thLatest: "Latest",
  thRecent30d: "30 Days",
  thBaseline: "Baseline",
  thDelta: "Change",
  thTrend: "Trend",
  recoveryTableCaption: "Latest values, 30-day averages, 90-day baselines, and changes for recovery metrics",

  // ── Recovery row labels ───────────────────────────────────────────
  rowRestingHr: "Resting HR",
  rowHrv: "HRV",
  rowOxygen: "Blood Oxygen",
  rowRespiratoryRate: "Respiratory Rate",
  rowVo2Max: "VO2 Max",

  // ── Activity section ──────────────────────────────────────────────
  legendActivityEnergy: "Daily Active Energy",
  legendExerciseMin: "Exercise Min",
  legendStandHours: "Stand Hours",
  activityEnergyRecent: "30-Day Daily Active Energy",
  activityExerciseRecent: "30-Day Exercise",
  activityStandRecent: "30-Day Stand",
  whoAssessment: "Weekly Activity Context",

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
  actionsPriority: "Priority Actions",
  actionsSeekCare: "When to Seek Medical Attention",
  actionsDoctorQuestions: "Questions for Your Next Doctor Visit",

  // ── Appendix ──────────────────────────────────────────────────────
  appendixTitle: "Data Boundaries & Notes",
  appendixDataLimitations: "Data Limitations",
  appendixSourceConfidence: "Data Coverage & Source Consistency",

  // ── Date range display ────────────────────────────────────────────
  windowStart: "Start",

  // ── Chart aria labels (chartSvg.ts) ───────────────────────────────
  sparklineAriaLabel: (label: string) => `${label} sparkline`,
  barChartAriaLabel: (label: string) => `${label} bar chart`,
  lineChartAriaLabel: "Trend chart",
  chartSeriesAriaSummary: (
    label,
    count,
    firstLabel,
    firstValue,
    latestLabel,
    latestValue,
    minValue,
    maxValue,
  ) =>
    `${label}: ${count} ${count === 1 ? "data point" : "data points"}; first ${firstLabel}, ${firstValue}; latest ${latestLabel}, ${latestValue}; range ${minValue} to ${maxValue}.`,
  chartNoDataAriaSummary: "No numeric data points are available to summarize.",
  chartGranularityNote:
    "The x-axis uses real time and one granularity for the full span: daily within 90 days, weekly within 2 years, and monthly for longer histories, so different time scales are not crowded into one chart.",

  // ── Cross-report navigation ───────────────────────────────────────
  crossReportTraining: "Training Report",
  crossReportHealth: "Health Report",

  // ── Markdown-specific strings ─────────────────────────────────────
  mdReportTitle: "Apple Health Report",
  mdAssessmentTitle: "Recent Data Summary",
  mdCompositeScore: "Composite Score",
  mdOverallStatus: "Overall Status",
  mdCrossMetricTitle: "Cross-Metric Patterns",
  mdBehavioralPatterns: "Behavioral Patterns",
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
  mdFactSleepNormalRange: "Sleep reference range: ",
  mdFactRecoveryInterpretation: "Recovery interpretation: ",
  mdFactRecoveryNormalRange: "Recovery reference context: ",
  mdFactActivityInterpretation: "Activity interpretation: ",
  mdFactActivityNormalRange: "Activity reference context: ",
  mdFactMenstrualCycle: (avg: string, period: string, total: number) =>
    `Menstrual cycle: average ${avg}, period ${period}, ${total} cycles total`,
  mdFactMenstrualInterpretation: "Menstrual cycle interpretation: ",
  mdFactMenstrualNormalRange: "Reference context: ",
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
  footerTagline: "Apple Health analysis · raw exports parsed locally",
  projectBoundary: "Independent open-source project · not affiliated with Apple",
};
