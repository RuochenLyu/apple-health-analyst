import {
  NARRATIVE_REPORT_SCHEMA_VERSION,
  type InsightBundle,
  type NarrativeChartCallout,
  type NarrativeReport,
} from "../types.js";

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`report.llm.json 字段 ${field} 必须是非空字符串。`);
  }
  return value.trim();
}

function ensureStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`report.llm.json 字段 ${field} 必须是字符串数组。`);
  }
  return value.map((entry, index) => ensureString(entry, `${field}[${index}]`));
}

function ensureChartCallouts(
  value: unknown,
  availableChartIds: Array<InsightBundle["charts"][number]["id"]>,
): NarrativeChartCallout[] {
  if (!Array.isArray(value)) {
    throw new Error("report.llm.json 字段 chart_callouts 必须是数组。");
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`report.llm.json 字段 chart_callouts[${index}] 必须是对象。`);
    }

    const candidate = entry as Record<string, unknown>;
    const chartId = ensureString(candidate.chart_id, `chart_callouts[${index}].chart_id`);
    if (!availableChartIds.includes(chartId as InsightBundle["charts"][number]["id"])) {
      throw new Error(`report.llm.json 中引用了未知图表 ${chartId}。`);
    }

    return {
      chart_id: chartId as InsightBundle["charts"][number]["id"],
      title: ensureString(candidate.title, `chart_callouts[${index}].title`),
      summary: ensureString(candidate.summary, `chart_callouts[${index}].summary`),
    };
  });
}

export function validateNarrativeReport(
  value: unknown,
  availableChartIds: Array<InsightBundle["charts"][number]["id"]>,
): NarrativeReport {
  if (!value || typeof value !== "object") {
    throw new Error("report.llm.json 必须是对象。");
  }

  const candidate = value as Record<string, unknown>;
  const schemaVersion = ensureString(candidate.schema_version, "schema_version");
  if (schemaVersion !== NARRATIVE_REPORT_SCHEMA_VERSION) {
    throw new Error(
      `report.llm.json schema_version 必须为 ${NARRATIVE_REPORT_SCHEMA_VERSION}，收到 ${schemaVersion}。`,
    );
  }

  return {
    schema_version: schemaVersion,
    health_assessment: ensureString(candidate.health_assessment, "health_assessment"),
    cross_metric_insights: ensureStringArray(candidate.cross_metric_insights, "cross_metric_insights"),
    behavioral_patterns: ensureStringArray(candidate.behavioral_patterns, "behavioral_patterns"),
    overview: ensureString(candidate.overview, "overview"),
    key_findings: ensureStringArray(candidate.key_findings, "key_findings"),
    strengths: ensureStringArray(candidate.strengths, "strengths"),
    watchouts: ensureStringArray(candidate.watchouts, "watchouts"),
    actions_next_2_weeks: ensureStringArray(candidate.actions_next_2_weeks, "actions_next_2_weeks"),
    when_to_seek_care: ensureStringArray(candidate.when_to_seek_care, "when_to_seek_care"),
    data_limitations: ensureStringArray(candidate.data_limitations, "data_limitations"),
    chart_callouts: ensureChartCallouts(candidate.chart_callouts, availableChartIds),
    disclaimer: ensureString(candidate.disclaimer, "disclaimer"),
  };
}
