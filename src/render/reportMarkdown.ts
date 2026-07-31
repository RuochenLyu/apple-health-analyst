import type { RenderT } from "../i18n/zh/render.js";
import type { InsightBundle, NarrativeReport } from "../types.js";

function makeFmt(insufficientLabel: string, locale: string) {
  return function fmt(value: number | null, suffix = ""): string {
    return value === null
      ? insufficientLabel
      : `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}${suffix}`;
  };
}

function labeled(label: string, value: string, t: RenderT): string {
  return t.htmlLang === "zh-CN" ? `${label}：${value}` : `${label}: ${value}`;
}

function parenthetical(value: string, t: RenderT): string {
  return t.htmlLang === "zh-CN" ? `（${value}）` : `(${value})`;
}

function joinEvidence(values: string[], t: RenderT): string {
  return values.join(t.htmlLang === "zh-CN" ? "；" : "; ");
}

function section(title: string, values: string[]): string {
  if (values.length === 0) return "";
  return `## ${title}\n${values.map((value) => `- ${value}`).join("\n")}`;
}

export function renderReportMarkdown(insights: InsightBundle, narrative: NarrativeReport, t: RenderT): string {
  const fmt = makeFmt(t.insufficientData, t.locale);
  const callouts = new Map(narrative.chart_callouts.map((item) => [item.chart_id, item]));
  const signalLines = [
    ...insights.riskFlags.map(
      (flag) => `[${flag.severity.toUpperCase()}] ${labeled(flag.title, `${flag.summary} ${parenthetical(joinEvidence(flag.evidence, t), t)}`, t)}`,
    ),
    ...insights.notableChanges.map(
      (change) => `[${change.direction}] ${labeled(change.title, `${change.summary} ${parenthetical(joinEvidence(change.evidence, t), t)}`, t)}`,
    ),
  ];

  const lines = [
    `# ${t.mdReportTitle}`,
    "",
    `## ${t.mdAssessmentTitle}`,
    narrative.health_assessment,
    "",
    section(t.mdCrossMetricTitle, narrative.cross_metric_insights),
    "",
    section(t.mdBehavioralPatterns, narrative.behavioral_patterns),
    "",
    `## ${t.mdOverviewTitle}`,
    narrative.overview,
    "",
    section(t.mdKeyFindings, narrative.key_findings),
    "",
    section(t.mdStrengths, narrative.strengths),
    "",
    section(t.mdWatchouts, narrative.watchouts),
    "",
    section(t.mdActionsNext2Weeks, narrative.actions_next_2_weeks),
    "",
    section(t.mdSeekCare, narrative.when_to_seek_care),
    "",
    section(t.mdDoctorQuestions, narrative.questions_for_doctor),
    "",
    section(t.mdDataLimitations, narrative.data_limitations),
    "",
    `## ${t.mdDataRangeTitle}`,
    `- ${labeled(t.mdExportDate, insights.input.exportDate ?? t.mdExportDateUnknown, t)}`,
    `- ${labeled(t.mdAnalysisWindow, `${insights.coverage.windowStart ?? t.windowStart} -> ${insights.coverage.windowEnd}`, t)}`,
    `- ${labeled(t.mdRecordCount, `${insights.coverage.recordCount}`, t)}`,
    `- ${labeled(t.mdWorkoutCount, `${insights.coverage.workoutCount}`, t)}`,
    `- ${labeled(t.mdActivitySummaryCount, `${insights.coverage.activitySummaryCount}`, t)}`,
    "",
    `## ${t.mdPrimarySourcesTitle}`,
    `- ${labeled(t.mdPrimarySleep, insights.primarySources.sleep ?? t.insufficientData, t)}`,
    `- ${labeled(t.mdPrimaryRecovery, Object.entries(insights.primarySources.recovery)
      .map(([metric, source]) => `${metric}=${source}`)
      .join(t.mdPrimarySeparator) || t.insufficientData, t)}`,
    `- ${labeled(t.mdPrimaryBody, Object.entries(insights.primarySources.bodyComposition)
      .map(([metric, source]) => `${metric}=${source}`)
      .join(t.mdPrimarySeparator) || t.insufficientData, t)}`,
    `- ${labeled(t.mdPrimaryActivity, insights.primarySources.activity, t)}`,
    "",
    section(t.mdRiskSignalsTitle, signalLines),
    "",
    `## ${t.mdChartInterpretationTitle}`,
    ...insights.charts.map((chart) => {
      const callout = callouts.get(chart.id);
      const primarySeries = chart.series[0];
      const lastValue = primarySeries?.points.at(-1)?.value ?? null;
      return `- ${labeled(chart.title, `${callout?.summary ?? chart.subtitle} ${t.mdChartCurrentValue(fmt(
        lastValue,
        primarySeries?.unit ? ` ${primarySeries.unit}` : "",
      ))}`, t)}`;
    }),
    "",
    `## ${t.mdHistoricalTitle}`,
    `- ${t.mdHistoricalSpan(insights.historicalContext.scope.totalSpanDays, insights.historicalContext.scope.earliestSeen ?? t.mdExportDateUnknown, insights.historicalContext.scope.latestSeen ?? t.mdExportDateUnknown)}`,
    `- ${t.mdHistoricalSleep(fmt(insights.historicalContext.sleep.recent30d.avgSleepHours, t.unitHours), fmt(insights.historicalContext.sleep.trailing180d.avgSleepHours, t.unitHours), fmt(insights.historicalContext.sleep.allTime.avgSleepHours, t.unitHours))}`,
    `- ${t.mdHistoricalRecovery(fmt(insights.historicalContext.recovery.restingHeartRate?.recent30d.average ?? null, ` ${insights.historicalContext.recovery.restingHeartRate?.unit ?? ""}`), fmt(insights.historicalContext.recovery.restingHeartRate?.allTime.average ?? null, ` ${insights.historicalContext.recovery.restingHeartRate?.unit ?? ""}`), fmt(insights.historicalContext.recovery.hrv?.recent30d.average ?? null, ` ${insights.historicalContext.recovery.hrv?.unit ?? ""}`), fmt(insights.historicalContext.recovery.hrv?.allTime.average ?? null, ` ${insights.historicalContext.recovery.hrv?.unit ?? ""}`))}`,
    `- ${t.mdHistoricalActivity(fmt(insights.historicalContext.activity.recent30d.exerciseMinutes, t.unitMinutes), fmt(insights.historicalContext.activity.trailing180d.exerciseMinutes, t.unitMinutes), fmt(insights.historicalContext.activity.allTime.exerciseMinutes, t.unitMinutes))}`,
    `- ${t.mdHistoricalBody(fmt(insights.historicalContext.bodyComposition.bodyMass?.recent30d.average ?? null, ` ${insights.historicalContext.bodyComposition.bodyMass?.unit ?? ""}`), fmt(insights.historicalContext.bodyComposition.bodyMass?.allTime.average ?? null, ` ${insights.historicalContext.bodyComposition.bodyMass?.unit ?? ""}`), fmt(insights.historicalContext.bodyComposition.bodyFatPercentage?.recent30d.average ?? null, ` ${insights.historicalContext.bodyComposition.bodyFatPercentage?.unit ?? ""}`), fmt(insights.historicalContext.bodyComposition.bodyFatPercentage?.allTime.average ?? null, ` ${insights.historicalContext.bodyComposition.bodyFatPercentage?.unit ?? ""}`))}`,
    ...insights.historicalContext.interpretationHints.map((hint) => `- ${t.mdInterpretationHintPrefix}${hint}`),
    "",
    `## ${t.mdStructuredFactsTitle}`,
    `- ${t.mdFactSleep(fmt(insights.analysis.sleep.recent30d.avgSleepHours, t.unitHours), fmt(insights.analysis.sleep.baseline90d.avgSleepHours, t.unitHours), fmt(insights.analysis.sleep.delta.sleepHours, t.unitHours))}`,
    `- ${t.mdFactRecovery(fmt(insights.analysis.recovery.metrics.restingHeartRate?.recent30d.average ?? null, ` ${insights.analysis.recovery.metrics.restingHeartRate?.unit ?? ""}`), fmt(insights.analysis.recovery.metrics.hrv?.recent30d.average ?? null, ` ${insights.analysis.recovery.metrics.hrv?.unit ?? ""}`))}`,
    `- ${t.mdFactActivity(fmt(insights.analysis.activity.recent30d.exerciseMinutes, t.unitMinutes), insights.analysis.activity.recent30d.workouts)}`,
    `- ${t.mdFactBody(fmt(insights.analysis.bodyComposition.metrics.bodyMass?.recent30d.average ?? null, ` ${insights.analysis.bodyComposition.metrics.bodyMass?.unit ?? ""}`), fmt(insights.analysis.bodyComposition.metrics.bodyFatPercentage?.recent30d.average ?? null, ` ${insights.analysis.bodyComposition.metrics.bodyFatPercentage?.unit ?? ""}`))}`,
    `- ${t.mdFactSleepInterpretation}${insights.analysis.sleep.healthInsights.interpretation}`,
    `- ${t.mdFactSleepNormalRange}${insights.analysis.sleep.healthInsights.normalRangeAssessment}`,
    `- ${t.mdFactRecoveryInterpretation}${insights.analysis.recovery.healthInsights.interpretation}`,
    `- ${t.mdFactRecoveryNormalRange}${insights.analysis.recovery.healthInsights.normalRangeAssessment}`,
    `- ${t.mdFactActivityInterpretation}${insights.analysis.activity.healthInsights.interpretation}`,
    `- ${t.mdFactActivityNormalRange}${insights.analysis.activity.healthInsights.normalRangeAssessment}`,
    ...(insights.analysis.menstrualCycle
      ? [
          `- ${t.mdFactMenstrualCycle(fmt(insights.analysis.menstrualCycle.avgCycleLengthDays, t.unitDays), fmt(insights.analysis.menstrualCycle.avgPeriodDurationDays, t.unitDays), insights.analysis.menstrualCycle.totalPeriods)}`,
          `- ${t.mdFactMenstrualInterpretation}${insights.analysis.menstrualCycle.healthInsights.interpretation}`,
          `- ${t.mdFactMenstrualNormalRange}${insights.analysis.menstrualCycle.healthInsights.normalRangeAssessment}`,
        ]
      : []),
    "",
    `## ${t.mdDisclaimerTitle}`,
    narrative.disclaimer,
    "",
  ];

  const compactLines = lines.filter(
    (line, index) => line !== "" || index === 0 || lines[index - 1] !== "",
  );
  return `${compactLines.join("\n").trimEnd()}\n`;
}
