import type { InsightBundle, NarrativeReport } from "../types.js";

function fmt(value: number | null, suffix = ""): string {
  return value === null ? "数据不足" : `${value}${suffix}`;
}

function section(title: string, values: string[]): string {
  return `## ${title}\n${values.map((value) => `- ${value}`).join("\n")}`;
}

export function renderReportMarkdown(insights: InsightBundle, narrative: NarrativeReport): string {
  const callouts = new Map(narrative.chart_callouts.map((item) => [item.chart_id, item]));
  const cm = insights.crossMetric;
  const scoresParts: string[] = [];
  if (cm.compositeAssessment.sleepScore !== null) scoresParts.push(`睡眠 ${cm.compositeAssessment.sleepScore}/100`);
  if (cm.compositeAssessment.recoveryScore !== null) scoresParts.push(`恢复 ${cm.compositeAssessment.recoveryScore}/100`);
  if (cm.compositeAssessment.activityScore !== null) scoresParts.push(`活动 ${cm.compositeAssessment.activityScore}/100`);

  const lines = [
    "# Apple Health 健康报告",
    "",
    "## 综合健康评估",
    narrative.health_assessment,
    "",
    scoresParts.length > 0 ? `**综合评分**：${scoresParts.join(" | ")}` : "",
    cm.compositeAssessment.overallReadiness ? `**整体状态**：${cm.compositeAssessment.overallReadiness === "good" ? "良好" : cm.compositeAssessment.overallReadiness === "moderate" ? "中等" : "偏低"}` : "",
    "",
    section("跨指标关联分析", narrative.cross_metric_insights),
    "",
    section("行为模式", narrative.behavioral_patterns),
    "",
    "## 概览",
    narrative.overview,
    "",
    section("关键发现", narrative.key_findings),
    "",
    section("做得好的地方", narrative.strengths),
    "",
    section("需要重点留意", narrative.watchouts),
    "",
    section("接下来两周建议", narrative.actions_next_2_weeks),
    "",
    section("何时建议复查或就医", narrative.when_to_seek_care),
    "",
    section("数据局限", narrative.data_limitations),
    "",
    "## 数据范围",
    `- 导出日期：${insights.input.exportDate ?? "未知"}`,
    `- 分析窗口：${insights.coverage.windowStart ?? "起始"} -> ${insights.coverage.windowEnd}`,
    `- 记录数：${insights.coverage.recordCount}`,
    `- 训练数：${insights.coverage.workoutCount}`,
    `- 活动摘要数：${insights.coverage.activitySummaryCount}`,
    "",
    "## 主数据源",
    `- 睡眠：${insights.primarySources.sleep ?? "数据不足"}`,
    `- 恢复：${Object.entries(insights.primarySources.recovery)
      .map(([metric, source]) => `${metric}=${source}`)
      .join("，") || "数据不足"}`,
    `- 身体成分：${Object.entries(insights.primarySources.bodyComposition)
      .map(([metric, source]) => `${metric}=${source}`)
      .join("，") || "数据不足"}`,
    `- 活动：${insights.primarySources.activity}`,
    "",
    "## 确定性信号",
    ...insights.riskFlags.map(
      (flag) => `- [${flag.severity.toUpperCase()}] ${flag.title}：${flag.summary}（${flag.evidence.join("；")}）`,
    ),
    ...insights.notableChanges.map(
      (change) => `- [${change.direction}] ${change.title}：${change.summary}（${change.evidence.join("；")}）`,
    ),
    "",
    "## 图表解读",
    ...insights.charts.map((chart) => {
      const callout = callouts.get(chart.id);
      const primarySeries = chart.series[0];
      const lastValue = primarySeries?.points.at(-1)?.value ?? null;
      return `- ${chart.title}：${callout?.summary ?? chart.subtitle} 当前主序列最近值为 ${fmt(
        lastValue,
        primarySeries?.unit ? ` ${primarySeries.unit}` : "",
      )}。`;
    }),
    "",
    "## 长期历史参照",
    `- 历史跨度：约 ${insights.historicalContext.scope.totalSpanDays} 天（${insights.historicalContext.scope.earliestSeen ?? "未知"} -> ${insights.historicalContext.scope.latestSeen ?? "未知"}）`,
    `- 睡眠：近 30 天 ${fmt(insights.historicalContext.sleep.recent30d.avgSleepHours, " 小时")}，过去 180 天 ${fmt(insights.historicalContext.sleep.trailing180d.avgSleepHours, " 小时")}，全时段 ${fmt(insights.historicalContext.sleep.allTime.avgSleepHours, " 小时")}`,
    `- 恢复：静息心率近 30 天 ${fmt(insights.historicalContext.recovery.restingHeartRate?.recent30d.average ?? null, ` ${insights.historicalContext.recovery.restingHeartRate?.unit ?? ""}`)}，全时段 ${fmt(insights.historicalContext.recovery.restingHeartRate?.allTime.average ?? null, ` ${insights.historicalContext.recovery.restingHeartRate?.unit ?? ""}`)}；HRV 近 30 天 ${fmt(insights.historicalContext.recovery.hrv?.recent30d.average ?? null, ` ${insights.historicalContext.recovery.hrv?.unit ?? ""}`)}，全时段 ${fmt(insights.historicalContext.recovery.hrv?.allTime.average ?? null, ` ${insights.historicalContext.recovery.hrv?.unit ?? ""}`)}`,
    `- 活动：近 30 天锻炼 ${fmt(insights.historicalContext.activity.recent30d.exerciseMinutes, " 分钟")}，过去 180 天 ${fmt(insights.historicalContext.activity.trailing180d.exerciseMinutes, " 分钟")}，全时段 ${fmt(insights.historicalContext.activity.allTime.exerciseMinutes, " 分钟")}`,
    `- 身体成分：体重近 30 天 ${fmt(insights.historicalContext.bodyComposition.bodyMass?.recent30d.average ?? null, ` ${insights.historicalContext.bodyComposition.bodyMass?.unit ?? ""}`)}，全时段 ${fmt(insights.historicalContext.bodyComposition.bodyMass?.allTime.average ?? null, ` ${insights.historicalContext.bodyComposition.bodyMass?.unit ?? ""}`)}；体脂率近 30 天 ${fmt(insights.historicalContext.bodyComposition.bodyFatPercentage?.recent30d.average ?? null, ` ${insights.historicalContext.bodyComposition.bodyFatPercentage?.unit ?? ""}`)}，全时段 ${fmt(insights.historicalContext.bodyComposition.bodyFatPercentage?.allTime.average ?? null, ` ${insights.historicalContext.bodyComposition.bodyFatPercentage?.unit ?? ""}`)}`,
    ...insights.historicalContext.interpretationHints.map((hint) => `- 解读提示：${hint}`),
    "",
    "## 结构化事实快照",
    `- 睡眠：近 30 天 ${fmt(insights.analysis.sleep.recent30d.avgSleepHours, " 小时")}，基线 ${fmt(insights.analysis.sleep.baseline90d.avgSleepHours, " 小时")}，变化 ${fmt(insights.analysis.sleep.delta.sleepHours, " 小时")}`,
    `- 恢复：静息心率 ${fmt(insights.analysis.recovery.metrics.restingHeartRate?.recent30d.average ?? null, ` ${insights.analysis.recovery.metrics.restingHeartRate?.unit ?? ""}`)}，HRV ${fmt(insights.analysis.recovery.metrics.hrv?.recent30d.average ?? null, ` ${insights.analysis.recovery.metrics.hrv?.unit ?? ""}`)}`,
    `- 活动：近 30 天锻炼 ${fmt(insights.analysis.activity.recent30d.exerciseMinutes, " 分钟")}，训练 ${insights.analysis.activity.recent30d.workouts} 次`,
    `- 身体成分：体重 ${fmt(insights.analysis.bodyComposition.metrics.bodyMass?.recent30d.average ?? null, ` ${insights.analysis.bodyComposition.metrics.bodyMass?.unit ?? ""}`)}，体脂率 ${fmt(insights.analysis.bodyComposition.metrics.bodyFatPercentage?.recent30d.average ?? null, ` ${insights.analysis.bodyComposition.metrics.bodyFatPercentage?.unit ?? ""}`)}`,
    "",
    "## 免责声明",
    narrative.disclaimer,
    "",
  ];

  return `${lines.join("\n")}\n`;
}
