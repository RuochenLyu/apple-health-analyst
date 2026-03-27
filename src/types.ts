export const PACKAGE_NAME = "apple-health-analyst";
export const PACKAGE_VERSION = "1.0.0";
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

export type OutputFormat = "markdown" | "json" | "html";

export type ModuleStatus = "ok" | "insufficient_data";

export interface BaseSample {
  sourceName: string;
  canonicalSource: string;
  startDate: Date;
  endDate: Date;
}

export interface SleepSample extends BaseSample {
  metric: "sleep";
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

export interface ParsedHealthExport {
  inputPath: string;
  mainXmlEntry: string;
  locale: string | null;
  exportDate: Date | null;
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
  attachments: AttachmentSummary;
}

export interface TimeWindow {
  requestedFrom: Date | null;
  requestedTo: Date | null;
  effectiveStart: Date | null;
  effectiveEnd: Date;
  recentStart: Date;
  baselineStart: Date;
}

export interface SelectedSource {
  canonicalName: string;
  displayName: string;
  rawNames: string[];
  recentSampleCount: number;
  totalSampleCount: number;
}

export interface PrimarySources {
  sleep: (SelectedSource & { staged: boolean; recentNightCount: number }) | null;
  recovery: Partial<Record<RecoveryMetricKey, SelectedSource>>;
  bodyComposition: Partial<Record<BodyMetricKey, SelectedSource>>;
  activity: string;
}

export interface WarningMessage {
  code: string;
  module: "sleep" | "recovery" | "activity" | "bodyComposition" | "overview";
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
  notes: string[];
}

export interface RecoveryAnalysis {
  status: ModuleStatus;
  sources: Partial<Record<RecoveryMetricKey, string>>;
  metrics: Partial<Record<RecoveryMetricKey, NumericComparison>>;
  notes: string[];
}

export interface ActivityWindowSummary {
  dayCount: number;
  activeEnergyBurnedKcal: number | null;
  exerciseMinutes: number | null;
  standHours: number | null;
  workouts: number;
  topWorkoutTypes: Array<{ type: string; count: number }>;
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
  notes: string[];
}

export interface BodyCompositionAnalysis {
  status: ModuleStatus;
  sources: Partial<Record<BodyMetricKey, string>>;
  metrics: Partial<Record<BodyMetricKey, NumericComparison>>;
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
  attachments: AttachmentSummary;
}

export const INSIGHT_SCHEMA_VERSION = "2.1.0";
export const NARRATIVE_REPORT_SCHEMA_VERSION = "2.0.0";

export type ChartGranularity = "day" | "week" | "month";
export type ChartVisual = "line" | "bar";
export type SeverityLevel = "low" | "medium" | "high";
export type ConfidenceLevel = "low" | "medium" | "high";
export type ChangeDirection = "improving" | "worsening" | "mixed" | "stable";

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
  id: "sleep" | "recovery" | "activity" | "bodyComposition";
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
    "warnings" | "sleep" | "recovery" | "activity" | "bodyComposition" | "attachments"
  >;
  charts: ChartGroup[];
  riskFlags: RiskFlag[];
  notableChanges: NotableChange[];
  dataGaps: DataGap[];
  sourceConfidence: SourceConfidence[];
  historicalContext: InsightHistoricalContext;
  crossMetric: import("./analyzers/crossMetric.js").CrossMetricAnalysis;
  narrativeContext: InsightNarrativeContext;
}

export interface NarrativeChartCallout {
  chart_id: InsightBundle["charts"][number]["id"];
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
  data_limitations: string[];
  chart_callouts: NarrativeChartCallout[];
  disclaimer: string;
}
