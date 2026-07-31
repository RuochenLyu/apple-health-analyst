export const PACKAGE_NAME = "apple-health-analyst";
export const PACKAGE_VERSION = "2.0.0";
export const RECENT_DAYS = 30;
export const BASELINE_DAYS = 90;

export type MetricKey =
  | "sleep"
  | "restingHeartRate"
  | "hrv"
  | "oxygenSaturation"
  | "respiratoryRate"
  | "vo2Max"
  | "bodyMass"
  | "bodyFatPercentage";

export type RecoveryMetricKey =
  | "restingHeartRate"
  | "hrv"
  | "oxygenSaturation"
  | "respiratoryRate"
  | "vo2Max";

export type BodyMetricKey = "bodyMass" | "bodyFatPercentage";

export type ModuleStatus = "ok" | "insufficient_data";

export interface BaseSample {
  sourceName: string;
  canonicalSource: string;
  startDate: Date;
  endDate: Date;
  /** Offset encoded in the HealthKit timestamp, used for local calendar semantics. */
  startTimezoneOffsetMinutes?: number;
  endTimezoneOffsetMinutes?: number;
}

export interface SleepSample extends BaseSample {
  metric: "sleep";
  value: string;
}

export interface MenstrualFlowSample extends BaseSample {
  metric: "menstrualFlow";
  value: string;
}

export interface IntermenstrualBleedingSample extends BaseSample {
  metric: "intermenstrualBleeding";
  value: string;
}

export interface ContraceptiveSample extends BaseSample {
  metric: "contraceptive";
  value: string;
}

export interface QuantitySample extends BaseSample {
  metric: Exclude<MetricKey, "sleep">;
  value: number;
  unit?: string;
}

export interface WorkoutSample {
  sourceName: string;
  canonicalSource: string;
  workoutActivityType: string;
  durationMinutes: number | null;
  startDate: Date;
  endDate: Date;
  startTimezoneOffsetMinutes?: number;
  endTimezoneOffsetMinutes?: number;
  activeEnergyBurnedKcal: number | null;
  basalEnergyBurnedKcal: number | null;
  distanceKm: number | null;
  averageHeartRateBpm: number | null;
  minHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  averageMETs: number | null;
  isIndoor: boolean | null;
}

export interface ActivitySummarySample {
  date: Date;
  activeEnergyBurned: number | null;
  appleExerciseTime: number | null;
  appleStandHours: number | null;
}

export interface AttachmentSummary {
  ecgFiles: number;
  workoutRouteFiles: number;
  imageAttachments: number;
  otherFiles: number;
  exampleFiles: string[];
}

export interface SourceSummary {
  canonicalName: string;
  displayName: string;
  rawNames: string[];
  recordCount: number;
  workoutCount: number;
  metricCounts: Partial<Record<MetricKey, number>>;
}

export interface ParseDataQuality {
  /** Samples dropped because their timestamp was missing, invalid, or reversed. */
  excludedInvalidTimestampSamples: number;
  /** Activity summaries before the HealthKit/Activity era, commonly Unix-epoch sentinels. */
  excludedImplausibleActivitySummaries: number;
  /** Values dropped because their unit could not be normalized safely. */
  excludedUnsupportedUnitValues: number;
  /** Near-identical cross-source workout records removed before analysis. */
  deduplicatedWorkoutRecords: number;
}

export type BiologicalSex = "female" | "male" | "other" | null;

export interface ParsedHealthExport {
  inputPath: string;
  mainXmlEntry: string;
  locale: string | null;
  biologicalSex: BiologicalSex;
  exportDate: Date | null;
  exportTimezoneOffsetMinutes?: number;
  coverageStart: Date | null;
  coverageEnd: Date | null;
  recordCount: number;
  workoutCount: number;
  activitySummaryCount: number;
  sources: SourceSummary[];
  records: {
    sleep: SleepSample[];
    restingHeartRate: QuantitySample[];
    hrv: QuantitySample[];
    oxygenSaturation: QuantitySample[];
    respiratoryRate: QuantitySample[];
    vo2Max: QuantitySample[];
    bodyMass: QuantitySample[];
    bodyFatPercentage: QuantitySample[];
  };
  workouts: WorkoutSample[];
  activitySummaries: ActivitySummarySample[];
  menstrualFlow: MenstrualFlowSample[];
  intermenstrualBleeding: IntermenstrualBleedingSample[];
  contraceptive: ContraceptiveSample[];
  attachments: AttachmentSummary;
  dataQuality?: ParseDataQuality;
}

export interface TimeWindow {
  requestedFrom: Date | null;
  requestedTo: Date | null;
  effectiveStart: Date | null;
  effectiveEnd: Date;
  recentStart: Date;
  baselineStart: Date;
  /** Fixed offset from the export timestamp used to interpret CLI calendar dates. */
  calendarOffsetMinutes?: number;
}

export interface SelectedSource {
  canonicalName: string;
  displayName: string;
  rawNames: string[];
  recentSampleCount: number;
  totalSampleCount: number;
  /** Samples inside the explicit analysis window. */
  windowSampleCount?: number;
  /** Distinct UTC calendar days represented inside the analysis window. */
  windowCoverageDays?: number;
}

export interface PrimarySources {
  sleep: (SelectedSource & { staged: boolean; recentNightCount: number; windowNightCount?: number }) | null;
  recovery: Partial<Record<RecoveryMetricKey, SelectedSource>>;
  bodyComposition: Partial<Record<BodyMetricKey, SelectedSource>>;
  activity: string;
}

export interface WarningMessage {
  code: string;
  module: "sleep" | "recovery" | "activity" | "bodyComposition" | "menstrualCycle" | "overview";
  message: string;
}

export type AnalysisModule = WarningMessage["module"];

export interface NumericWindow {
  sampleCount: number;
  average: number | null;
}

export interface NumericComparison {
  unit: string;
  source: string;
  coverageDays: number;
  sampleCount: number;
  recent30d: NumericWindow;
  baseline90d: NumericWindow;
  delta: number | null;
  latest: { timestamp: string; value: number } | null;
}

export interface SleepWindowSummary {
  nights: number;
  avgSleepHours: number | null;
  avgAwakeHours: number | null;
  medianBedtime: string | null;
  medianWakeTime: string | null;
  stagePct: {
    core: number | null;
    rem: number | null;
    deep: number | null;
    unspecified: number | null;
  };
}

export interface SleepHealthInsights {
  sleepTrend: "improving" | "declining" | "stable" | null;
  sleepTrendDelta: number | null;
  deepSleepAssessment: string;
  remSleepAssessment: string;
  normalRangeAssessment: string;
  interpretation: string;
  actionableAdvice: string[];
  doctorTalkingPoints: string[];
}

export interface SleepAnalysis {
  status: ModuleStatus;
  source: string | null;
  coverageDays: number;
  sampleCount: number;
  staged: boolean;
  recent30d: SleepWindowSummary;
  baseline90d: SleepWindowSummary;
  delta: {
    sleepHours: number | null;
    awakeHours: number | null;
    corePct: number | null;
    remPct: number | null;
    deepPct: number | null;
  };
  partialNights: Array<{ date: string; totalSleepHours: number }>;
  healthInsights: SleepHealthInsights;
  notes: string[];
}

export interface RecoveryHealthInsights {
  rhrTrend: "improving" | "worsening" | "stable" | null;
  hrvTrend: "improving" | "worsening" | "stable" | null;
  spo2Assessment: string;
  normalRangeAssessment: string;
  interpretation: string;
  actionableAdvice: string[];
  doctorTalkingPoints: string[];
}

export interface RecoveryAnalysis {
  status: ModuleStatus;
  sources: Partial<Record<RecoveryMetricKey, string>>;
  metrics: Partial<Record<RecoveryMetricKey, NumericComparison>>;
  healthInsights: RecoveryHealthInsights;
  notes: string[];
}

export interface ActivityWindowSummary {
  dayCount: number;
  activeEnergyBurnedKcal: number | null;
  exerciseMinutes: number | null;
  standHours: number | null;
  workouts: number;
  topWorkoutTypes: WorkoutTypeAggregate[];
}

export interface ActivityHealthInsights {
  activityTrend: "improving" | "declining" | "stable" | null;
  activityTrendDelta: number | null;
  whoGuidelineAssessment: string;
  workoutVariety: string;
  normalRangeAssessment: string;
  interpretation: string;
  actionableAdvice: string[];
  doctorTalkingPoints: string[];
}

export interface ActivityAnalysis {
  status: ModuleStatus;
  source: string;
  coverageDays: number;
  recent30d: ActivityWindowSummary;
  baseline90d: ActivityWindowSummary;
  delta: {
    activeEnergyBurnedKcal: number | null;
    exerciseMinutes: number | null;
    standHours: number | null;
    workouts: number | null;
  };
  healthInsights: ActivityHealthInsights;
  notes: string[];
}

export interface BodyCompositionAnalysis {
  status: ModuleStatus;
  sources: Partial<Record<BodyMetricKey, string>>;
  metrics: Partial<Record<BodyMetricKey, NumericComparison>>;
  notes: string[];
}

export type MenstrualRegularity = "regular" | "somewhat_irregular" | "irregular";

export interface DetectedPeriod {
  startDate: string;
  endDate: string;
  durationDays: number;
  flowIntensity: {
    light: number;
    medium: number;
    heavy: number;
    unspecified: number;
    none: number;
  };
}

export interface MenstrualCycleAnalysis {
  status: ModuleStatus;
  source: string | null;
  totalPeriods: number;
  coverageDays: number;
  avgCycleLengthDays: number | null;
  cycleLengthStdDays: number | null;
  avgPeriodDurationDays: number | null;
  regularity: MenstrualRegularity | null;
  recentCycles: Array<{
    periodStart: string;
    cycleLengthDays: number | null;
    periodDurationDays: number;
  }>;
  flowDistribution: {
    light: number;
    medium: number;
    heavy: number;
    unspecified: number;
  };
  intermenstrualBleedingCount: number;
  intermenstrualBleedingFrequencyPerCycle: number | null;
  contraceptiveUse: string | null;
  recent90d: {
    periods: number;
    avgCycleLengthDays: number | null;
    intermenstrualBleedingDays: number;
  };
  historical: {
    periods: number;
    avgCycleLengthDays: number | null;
  };
  healthInsights: {
    cycleTrend: "lengthening" | "shortening" | "stable" | null;
    cycleTrendDelta: number | null;
    periodDurationTrend: "lengthening" | "shortening" | "stable" | null;
    flowPattern: string;
    normalRangeAssessment: string;
    interpretation: string;
    actionableAdvice: string[];
    doctorTalkingPoints: string[];
  };
  notes: string[];
}

export interface AnalysisSummary {
  metadata: {
    tool: string;
    version: string;
    generatedAt: string;
  };
  input: {
    zipPath: string;
    mainXmlEntry: string;
    from: string | null;
    to: string | null;
    exportDate: string | null;
    locale: string | null;
  };
  coverage: {
    recordCount: number;
    workoutCount: number;
    activitySummaryCount: number;
    earliestSeen: string | null;
    latestSeen: string | null;
    windowStart: string | null;
    windowEnd: string;
    excludedInvalidTimestampSamples?: number;
    excludedImplausibleActivitySummaries?: number;
    excludedUnsupportedUnitValues?: number;
    deduplicatedWorkoutRecords?: number;
  };
  sources: {
    discovered: SourceSummary[];
    primary: {
      sleep: string | null;
      recovery: Partial<Record<RecoveryMetricKey, string>>;
      bodyComposition: Partial<Record<BodyMetricKey, string>>;
      activity: string;
    };
  };
  warnings: WarningMessage[];
  sleep: SleepAnalysis;
  recovery: RecoveryAnalysis;
  activity: ActivityAnalysis;
  bodyComposition: BodyCompositionAnalysis;
  menstrualCycle?: MenstrualCycleAnalysis;
  attachments: AttachmentSummary;
}

export const INSIGHT_SCHEMA_VERSION = "3.0.0";
export const NARRATIVE_REPORT_SCHEMA_VERSION = "3.0.0";
export const TRAINING_NARRATIVE_REPORT_SCHEMA_VERSION = "2.0.0";

export type ChartGranularity = "day" | "week" | "month";
export type ChartVisual = "line" | "bar" | "area";
export type SeverityLevel = "low" | "medium" | "high";
export type ConfidenceLevel = "low" | "medium" | "high";
export type ChangeDirection = "improving" | "worsening" | "mixed" | "stable";
export type ReportType = "health" | "training";

export interface ChartPoint {
  start: string;
  end: string;
  granularity: ChartGranularity;
  label: string;
  value: number | null;
  sampleCount: number;
}

export interface ChartSeries {
  id: string;
  label: string;
  unit: string;
  visual: ChartVisual;
  points: ChartPoint[];
}

export interface ChartGroup {
  id: string;
  title: string;
  subtitle: string;
  series: ChartSeries[];
}

export interface RiskFlag {
  id: string;
  module: AnalysisModule;
  severity: SeverityLevel;
  title: string;
  summary: string;
  evidence: string[];
  recommendationFocus: string;
  seekCare: boolean;
}

export interface NotableChange {
  id: string;
  module: AnalysisModule;
  direction: ChangeDirection;
  title: string;
  summary: string;
  evidence: string[];
}

export interface DataGap {
  id: string;
  module: AnalysisModule;
  severity: "info" | "warning";
  summary: string;
}

export interface SourceConfidence {
  module: Exclude<AnalysisModule, "overview">;
  level: ConfidenceLevel;
  summary: string;
}

export interface HistoricalNumericWindow {
  sampleCount: number;
  average: number | null;
}

export interface HistoricalSleepDelta {
  sleepHours: number | null;
  awakeHours: number | null;
  deepPct: number | null;
  remPct: number | null;
}

export interface NumericHistoricalContext {
  unit: string;
  coverageDays: number;
  sampleCount: number;
  latest: NumericComparison["latest"];
  recent30d: HistoricalNumericWindow;
  baseline90d: HistoricalNumericWindow;
  trailing180d: HistoricalNumericWindow;
  allTime: HistoricalNumericWindow;
  recentVsBaseline90d: number | null;
  recentVsTrailing180d: number | null;
  recentVsAllTime: number | null;
}

export interface SleepHistoricalContext {
  coverageDays: number;
  sampleCount: number;
  staged: boolean;
  recent30d: SleepWindowSummary;
  baseline90d: SleepWindowSummary;
  trailing180d: SleepWindowSummary;
  allTime: SleepWindowSummary;
  recentVsBaseline90d: HistoricalSleepDelta;
  recentVsTrailing180d: HistoricalSleepDelta;
  recentVsAllTime: HistoricalSleepDelta;
}

export interface ActivityHistoricalDelta {
  activeEnergyBurnedKcal: number | null;
  exerciseMinutes: number | null;
  standHours: number | null;
  workouts: number | null;
}

export interface WorkoutTypeAggregate {
  type: string;
  label: string;
  count: number;
  totalDurationMinutes: number | null;
  averageDurationMinutes: number | null;
}

export interface WorkoutTypeWindowSummary {
  workouts: number;
  daysWithWorkouts: number;
  totalDurationMinutes: number | null;
  averageDurationMinutes: number | null;
  longestWorkoutMinutes: number | null;
  totalActiveEnergyBurnedKcal: number | null;
  averageActiveEnergyBurnedKcal: number | null;
  averageHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  totalDistanceKm: number | null;
  averageDistanceKm: number | null;
  averageMETs: number | null;
  heartRateCoveragePct: number | null;
  distanceCoveragePct: number | null;
  activeEnergyCoveragePct: number | null;
  metsCoveragePct: number | null;
  firstWorkoutDate: string | null;
  lastWorkoutDate: string | null;
}

export interface WorkoutTypeHistoricalDelta {
  workouts: number | null;
  totalDurationMinutes: number | null;
  averageDurationMinutes: number | null;
}

export interface WorkoutTypeMonthlySummary {
  month: string;
  workouts: number;
  totalDurationMinutes: number | null;
  averageDurationMinutes: number | null;
}

export interface WorkoutTypeYearlySummary {
  year: number;
  workouts: number;
  totalDurationMinutes: number | null;
  averageDurationMinutes: number | null;
}

export interface WorkoutTypeHistoricalContext {
  type: string;
  label: string;
  recent30d: WorkoutTypeWindowSummary;
  baseline90d: WorkoutTypeWindowSummary;
  trailing180d: WorkoutTypeWindowSummary;
  trailing365d: WorkoutTypeWindowSummary;
  allTime: WorkoutTypeWindowSummary;
  recentVsBaseline90d: WorkoutTypeHistoricalDelta;
  recentVsTrailing180d: WorkoutTypeHistoricalDelta;
  recentVsAllTime: WorkoutTypeHistoricalDelta;
  yearly: WorkoutTypeYearlySummary[];
  recentMonths: WorkoutTypeMonthlySummary[];
}

export interface ActivityHistoricalContext {
  coverageDays: number;
  source: string;
  recent30d: ActivityWindowSummary;
  baseline90d: ActivityWindowSummary;
  trailing180d: ActivityWindowSummary;
  allTime: ActivityWindowSummary;
  recentVsBaseline90d: ActivityHistoricalDelta;
  recentVsTrailing180d: ActivityHistoricalDelta;
  recentVsAllTime: ActivityHistoricalDelta;
  workoutTypes: WorkoutTypeHistoricalContext[];
}

export interface InsightHistoricalContext {
  scope: {
    earliestSeen: string | null;
    latestSeen: string | null;
    totalSpanDays: number;
  };
  sleep: SleepHistoricalContext;
  recovery: Partial<Record<RecoveryMetricKey, NumericHistoricalContext>>;
  activity: ActivityHistoricalContext;
  bodyComposition: Partial<Record<BodyMetricKey, NumericHistoricalContext>>;
  interpretationHints: string[];
}

export interface InsightNarrativeContext {
  audience: string;
  goal: string;
  language: string;
  outputSchemaVersion: string;
  boundaries: string[];
}

export type TrainingState =
  | "building"
  | "maintaining"
  | "recovering"
  | "strained"
  | "detraining"
  | "mixed"
  | "insufficient_data";

export type TrainingReadiness = "good" | "moderate" | "low" | "insufficient_data";
export type TrainingLoadTag = "load rising" | "load stable" | "load falling";
export type TrainingRecoveryTag =
  | "recovery supported"
  | "recovery mixed"
  | "recovery concern"
  | "recovery unknown";
export type TrainingConsistencyTag = "consistency good" | "consistency uneven";
export type TrainingFrequencyTrend = "denser" | "stable" | "sparser" | null;

export interface TrainingLoadDelta {
  workoutsPer30d: number | null;
  durationMinutesPer30d: number | null;
  activeEnergyBurnedKcalPer30d: number | null;
  distanceKmPer30d: number | null;
}

export interface TrainingConsistencySummary {
  recentMonths: WorkoutTypeMonthlySummary[];
  longestGapDays: number | null;
  frequencyTrend: TrainingFrequencyTrend;
  activeMonthsLast12: number;
}

export interface TrainingRecoveryAfterWorkout {
  /** Maximum available count retained for schema compatibility. */
  sampleCount: number;
  sleepSampleCount: number;
  hrvSampleCount: number;
  restingHeartRateSampleCount: number;
  sleepComparatorSampleCount: number;
  hrvComparatorSampleCount: number;
  restingHeartRateComparatorSampleCount: number;
  comparator: "other_observed_days";
  comparisonWindowStart: string;
  comparisonWindowEnd: string;
  nextDaySleepHoursDelta: number | null;
  nextDayHrvDelta: number | null;
  nextDayRestingHeartRateDelta: number | null;
}

export interface TrainingSportInsight {
  id: string;
  type: string;
  label: string;
  icon: string;
  recent30d: WorkoutTypeWindowSummary;
  baseline90d: WorkoutTypeWindowSummary;
  trailing180d: WorkoutTypeWindowSummary;
  trailing365d: WorkoutTypeWindowSummary;
  allTime: WorkoutTypeWindowSummary;
  normalizedDeltas: {
    recentVsBaseline90d: TrainingLoadDelta;
    recentVsTrailing180d: TrainingLoadDelta;
    recentVsAllTime: TrainingLoadDelta;
  };
  recoveryAfterWorkout: TrainingRecoveryAfterWorkout;
  consistency: TrainingConsistencySummary;
  statusTags: [TrainingLoadTag, TrainingRecoveryTag, TrainingConsistencyTag];
}

export interface TrainingLoadTrend {
  recent30dEquivWorkouts: number | null;
  baseline90dEquivWorkouts: number | null;
  recent30dEquivDurationMinutes: number | null;
  baseline90dEquivDurationMinutes: number | null;
  recent30dEquivActiveEnergyBurnedKcal: number | null;
  baseline90dEquivActiveEnergyBurnedKcal: number | null;
  recentVsBaseline90d: TrainingLoadDelta;
  recentWorkoutVariety: number;
  baselineWorkoutVariety: number;
  recentVsBaselineVariety: number;
}

export interface TrainingRecoverySupport {
  sleepDeltaHours: number | null;
  hrvDeltaPct: number | null;
  restingHeartRateDeltaBpm: number | null;
  adequate: boolean | null;
}

export interface TrainingLoadDaily {
  date: string;
  load: number;
  atl: number;
  ctl: number;
  tsb: number;
}

export interface TrainingLoadStatus {
  ctl: number;
  atl: number;
  tsb: number;
  ctlDelta30d: number | null;
  ctlDelta30dPct: number | null;
  ctlDelta90dPct: number | null;
  asOfDate: string;
  warmupDays: number;
  activeDays: number;
  atlAlpha: number;
  ctlAlpha: number;
}

export interface TrainingSummary {
  trainingState: TrainingState;
  readiness: TrainingReadiness;
  primarySportLabel: string | null;
  recent30dWorkouts: number;
  recent30dDurationMinutes: number | null;
  recent30dActiveEnergyBurnedKcal: number | null;
  loadTrend: TrainingLoadTrend;
  recoverySupport: TrainingRecoverySupport;
  /**
   * ATL / CTL / TSB snapshot for the latest analysis day. `null` when the
   * covered period is shorter than the CTL warm-up window or there are
   * not enough logged workouts.
   */
  trainingLoad: TrainingLoadStatus | null;
}

export interface TrainingInsightBundle {
  summary: TrainingSummary;
  sports: TrainingSportInsight[];
  charts: ChartGroup[];
  /**
   * Daily training-load series for the last ~365 days. Used by the calendar
   * heatmap in the rendered report. Only the last 12 months are emitted to
   * keep the JSON payload bounded.
   */
  dailyLoad: TrainingLoadDaily[];
  narrativeContext: InsightNarrativeContext;
}

export interface InsightBundle {
  metadata: {
    tool: string;
    version: string;
    generatedAt: string;
    schemaVersion: string;
    language: string;
  };
  input: AnalysisSummary["input"];
  coverage: AnalysisSummary["coverage"];
  primarySources: AnalysisSummary["sources"]["primary"];
  analysis: Pick<
    AnalysisSummary,
    "warnings" | "sleep" | "recovery" | "activity" | "bodyComposition" | "menstrualCycle" | "attachments"
  >;
  charts: ChartGroup[];
  riskFlags: RiskFlag[];
  notableChanges: NotableChange[];
  dataGaps: DataGap[];
  sourceConfidence: SourceConfidence[];
  historicalContext: InsightHistoricalContext;
  crossMetric: import("./analyzers/crossMetric.js").CrossMetricAnalysis;
  narrativeContext: InsightNarrativeContext;
  training: TrainingInsightBundle;
}

export interface NarrativeChartCallout {
  chart_id: string;
  title: string;
  summary: string;
}

export interface NarrativeReport {
  schema_version: string;
  health_assessment: string;
  cross_metric_insights: string[];
  behavioral_patterns: string[];
  overview: string;
  key_findings: string[];
  strengths: string[];
  watchouts: string[];
  actions_next_2_weeks: string[];
  when_to_seek_care: string[];
  questions_for_doctor: string[];
  data_limitations: string[];
  chart_callouts: NarrativeChartCallout[];
  disclaimer: string;
}

export interface TrainingSportNarrativeSection {
  sport_id: string;
  title: string;
  assessment: string;
  key_signals: string[];
  recommendations: string[];
}

export interface TrainingNarrativeReport {
  schema_version: string;
  training_assessment: string;
  overall_findings: string[];
  sport_sections: TrainingSportNarrativeSection[];
  watchouts: string[];
  actions_next_2_weeks: string[];
  questions_for_doctor: string[];
  data_limitations: string[];
  chart_callouts: NarrativeChartCallout[];
  disclaimer: string;
}
