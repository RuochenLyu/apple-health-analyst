import {
  NARRATIVE_REPORT_SCHEMA_VERSION,
  type InsightBundle,
  type NarrativeReport,
} from "../types.js";

function pickFirstLines(values: string[], fallback: string): string[] {
  const filtered = values.map((value) => value.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered : [fallback];
}

function fmt(value: number | null, suffix = ""): string {
  return value === null ? "数据不足" : `${value}${suffix}`;
}

export function createFallbackNarrative(insights: InsightBundle): NarrativeReport {
  const cm = insights.crossMetric;
  const strongestRisk = insights.riskFlags[0];
  const leadingPositive = insights.notableChanges.find((change) => change.direction === "improving");
  const lowConfidence = insights.sourceConfidence.filter((entry) => entry.level === "low");
  const historyHints = insights.historicalContext.interpretationHints;
  const sleepHistory = insights.historicalContext.sleep;
  const activityHistory = insights.historicalContext.activity;
  const bodyMassHistory = insights.historicalContext.bodyComposition.bodyMass;
  const spanDays = insights.historicalContext.scope.totalSpanDays;
  const sleepLongitudinalLine =
    sleepHistory.allTime.avgSleepHours !== null
      ? `最近 30 天平均睡眠 ${fmt(sleepHistory.recent30d.avgSleepHours, " 小时")}，过去 180 天 ${fmt(sleepHistory.trailing180d.avgSleepHours, " 小时")}，整个可用历史 ${fmt(sleepHistory.allTime.avgSleepHours, " 小时")}。`
      : "";
  const activityLongitudinalLine =
    activityHistory.allTime.exerciseMinutes !== null
      ? `最近 30 天平均锻炼 ${fmt(activityHistory.recent30d.exerciseMinutes, " 分钟")}，过去 180 天 ${fmt(activityHistory.trailing180d.exerciseMinutes, " 分钟")}，整个可用历史 ${fmt(activityHistory.allTime.exerciseMinutes, " 分钟")}。`
      : "";
  const bodyLongitudinalLine =
    bodyMassHistory?.allTime.average !== null && bodyMassHistory?.allTime.average !== undefined
      ? `最近 30 天平均体重 ${fmt(bodyMassHistory.recent30d.average, ` ${bodyMassHistory.unit}`)}，整个可用历史平均 ${fmt(bodyMassHistory.allTime.average, ` ${bodyMassHistory.unit}`)}。`
      : "";

  // ── health_assessment: 综合判断 ──
  const assessmentParts = [
    cm.compositeAssessment.summary,
    cm.recoveryCoherence.summary,
    strongestRisk
      ? `当前最需要优先关注的是"${strongestRisk.title}"。`
      : "当前没有显示出需要立刻处理的高优先级风险。",
  ].filter(Boolean);
  const healthAssessment = assessmentParts.join(" ");

  // ── cross_metric_insights: 跨指标关联 ──
  const crossMetricInsights = pickFirstLines(
    [
      cm.sleepRecoveryLink.summary,
      cm.activityRecoveryBalance.summary,
      cm.recoveryCoherence.summary,
      cm.sleepConsistency.summary,
    ].filter((s) => !s.includes("数据不足")),
    "跨指标关联数据不足，建议保持连续佩戴和记录以启用更深度的关联分析。",
  ).slice(0, 4);

  // ── behavioral_patterns: 行为模式 ──
  const behavioralPatterns = pickFirstLines(
    cm.patterns,
    "近期没有检测到需要特别指出的行为模式。",
  ).slice(0, 3);

  // ── overview ──
  const overviewParts = [
    spanDays > 0 ? `本次分析同时参考了最近 30 天、过去 180 天和约 ${spanDays} 天的可用历史。` : "",
    cm.compositeAssessment.overallReadiness === "good"
      ? "整体健康状态良好，睡眠、恢复和活动各维度处于较好水平。"
      : cm.compositeAssessment.overallReadiness === "moderate"
        ? "整体状态中等，有明确的改善空间。"
        : cm.compositeAssessment.overallReadiness === "low"
          ? "整体状态偏低，建议优先改善睡眠和恢复。"
          : "",
    historyHints[0] ?? "",
    leadingPositive
      ? `"${leadingPositive.title}"说明你已经有一部分趋势在朝更好的方向发展。`
      : "",
  ].filter(Boolean);

  return {
    schema_version: NARRATIVE_REPORT_SCHEMA_VERSION,
    health_assessment: healthAssessment,
    cross_metric_insights: crossMetricInsights,
    behavioral_patterns: behavioralPatterns,
    overview: overviewParts.join(" "),
    key_findings: pickFirstLines(
      [
        ...crossMetricInsights.slice(0, 2),
        ...historyHints.slice(0, 2),
        ...insights.riskFlags.slice(0, 2).map((flag) => `${flag.title}：${flag.summary}`),
        ...insights.notableChanges
          .filter((change) => change.direction === "improving")
          .slice(0, 2)
          .map((change) => `${change.title}：${change.summary}`),
        ...[sleepLongitudinalLine, activityLongitudinalLine].filter(Boolean),
      ],
      "当前可读样本有限，建议先延长记录周期，再看更稳定的趋势结论。",
    ),
    strengths: pickFirstLines(
      [
        ...insights.notableChanges
          .filter((change) => change.direction === "improving")
          .map((change) => `${change.title}：${change.summary}`),
        ...historyHints.filter((hint) => /更充足|更从容|方向较一致/.test(hint)),
        cm.activityRecoveryBalance.recoveryAdequate
          ? "训练后恢复充分，说明当前训练负荷在身体承受范围内。"
          : "",
        cm.sleepConsistency.regularity === "high"
          ? "作息规律性好，这对昼夜节律和激素分泌非常有利。"
          : "",
      ].filter(Boolean),
      "当前没有明显的高风险信号，基础健康管理仍有较大优化空间。",
    ),
    watchouts: pickFirstLines(
      [
        ...insights.riskFlags.map((flag) => `${flag.title}：${flag.recommendationFocus}`),
        ...historyHints.filter((hint) => /优先|留意|偏高|偏低/.test(hint)),
        cm.sleepConsistency.regularity === "low"
          ? "作息波动大，不规律的昼夜节律会影响深睡质量和 HRV 恢复。"
          : "",
        cm.activityRecoveryBalance.recoveryAdequate === false
          ? "训练后 HRV 恢复不充分，当前训练负荷可能超出恢复能力。"
          : "",
        bodyLongitudinalLine,
      ].filter(Boolean) as string[],
      "没有发现需要立即放大的风险信号，但仍建议关注睡眠、恢复和活动的一致性。",
    ),
    actions_next_2_weeks: pickFirstLines(
      [
        ...insights.riskFlags.slice(0, 2).map((flag) => flag.recommendationFocus),
        cm.sleepConsistency.regularity !== "high"
          ? "固定起床时间（误差控制在 30 分钟以内），入睡时间会自然趋于稳定。"
          : "",
        cm.activityRecoveryBalance.recoveryAdequate === false
          ? "每 2-3 天安排一个轻量恢复日，让 HRV 有时间回升。"
          : "",
        ...historyHints
          .filter((hint) => /优先|适合先/.test(hint))
          .map((hint) => hint.replace(/，/g, "，并 ").replace(/。$/, "。")),
        "优先保证记录连续性，让下一轮分析能看到更稳定的近期趋势。",
      ].filter(Boolean),
      "保持连续记录 2 周，再复盘睡眠、恢复和活动的变化方向。",
    ).slice(0, 4),
    when_to_seek_care: pickFirstLines(
      [
        ...insights.riskFlags
          .filter((flag) => flag.seekCare)
          .map((flag) => `${flag.title}：如果同类异常持续存在，或伴随明显不适，建议尽快复查并咨询医生。`),
        "如果近期持续出现明显疲劳、胸闷、呼吸不适、头晕或运动耐受明显下降，即使设备数据不完整，也建议尽快就医。",
      ],
      "如果出现持续恶化的异常数据并伴随明显不适，应及时寻求专业医生帮助。",
    ).slice(0, 3),
    data_limitations: pickFirstLines(
      [
        ...insights.dataGaps.map((gap) => gap.summary),
        ...lowConfidence.map((entry) => `${entry.summary} 这会降低相关结论的稳定性。`),
        spanDays >= 180 && insights.dataGaps.length > 0
          ? "虽然可用历史已经较长，但如果最近记录变稀疏，近期判断仍然需要保守。"
          : "",
      ],
      "当前数据覆盖尚可，但仍应把结论理解为趋势参考，而不是精确诊断。",
    ).slice(0, 4),
    chart_callouts: insights.charts.map((chart) => {
      const relatedRisk = insights.riskFlags.find((flag) => flag.module === chart.id);
      const relatedChange = insights.notableChanges.find((change) => change.module === chart.id);
      const relatedHistoryHint = historyHints.find((hint) => {
        if (chart.id === "sleep") return /睡眠/.test(hint);
        if (chart.id === "recovery") return /静息心率|HRV|恢复/.test(hint);
        if (chart.id === "activity") return /活动量|锻炼|训练/.test(hint);
        return /体重|体脂|摄入/.test(hint);
      });
      return {
        chart_id: chart.id,
        title: chart.title,
        summary:
          relatedRisk?.summary ??
          relatedChange?.summary ??
          relatedHistoryHint ??
          chart.subtitle,
      };
    }),
    disclaimer:
      "本报告仅用于健康管理和生活方式调整参考，不构成医疗诊断、治疗建议或替代专业医生意见。",
  };
}
