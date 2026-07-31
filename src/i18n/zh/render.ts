// ── Render layer translations (Chinese) ─────────────────────────────
// This file is the "source of truth" for RenderT.

export const renderZh = {
  // ── HTML meta ─────────────────────────────────────────────────────
  htmlLang: "zh-CN",
  locale: "zh-CN",
  reportTitle: "Apple Health 健康报告",

  // ── Shared helpers ────────────────────────────────────────────────
  insufficientData: "数据不足",
  dash: "—",

  // ── Confidence labels ─────────────────────────────────────────────
  confidenceHigh: "充足",
  confidenceMedium: "中等",
  confidenceLow: "不足",

  // ── Recovery table inline labels ──────────────────────────────────
  recentSamplesInsufficient: "近期样本不足",
  sparkBaseline: "基线",
  sparkRecent: "近期",
  sparkLatest: "最新",
  coverageDays: (days: number) => `覆盖 ${days} 天`,

  // ── Callout fallbacks ─────────────────────────────────────────────
  sleepCalloutFallback: "睡眠模块更适合看趋势方向和连续性。",
  recoveryCalloutFallback: "恢复指标更适合成组观察。",
  activityCalloutFallback: "活动模块同时呈现日常活动和训练节奏。",
  bodyCalloutFallback: "身体成分更适合看月度方向。",

  // ── Navigation ────────────────────────────────────────────────────
  navAssessment: "数据小结",
  navInsights: "分析",
  navActions: "建议",
  navSleep: "睡眠",
  navRecovery: "恢复",
  navActivity: "活动",
  navBody: "身体",
  navMenstrual: "生理期",
  navAppendix: "附录",
  skipToContent: "跳到报告正文",
  reportSectionsLabel: "报告章节",

  // ── Summary cards ─────────────────────────────────────────────────
  cardSleepAvg: "睡眠均值",
  cardRestingHr: "静息心率",
  cardRiskSignals: "风险信号",
  cardRiskNeedsAttention: "需要关注",
  cardRiskNoAbnormal: "未触发规则提示",
  cardDataGaps: "数据缺口",
  cardDataGapsAffectsConfidence: "影响置信度",
  cardDataGapsCoverageGood: "未发现主要缺口",
  cardRecent30d: "近 30 天",

  // ── Assessment section ────────────────────────────────────────────
  assessmentTitle: "近期数据小结",
  overallStatusLabel: "数据状态：",
  readinessGood: "相对稳定",
  readinessModerate: "信号混合",
  readinessLow: "需要留意",
  scoreSleep: "睡眠",
  scoreRecovery: "恢复",
  scoreActivity: "活动",

  // ── Insights section ──────────────────────────────────────────────
  insightsSectionTitle: "多指标模式",
  crossMetricTitle: "跨指标发现",
  behavioralPatternsTitle: "行为模式",
  evidenceDetailsTitle: "展开查看跨指标证据",

  // ── Overview / Findings ───────────────────────────────────────────
  overviewTitle: "概览",
  keyFindings: "关键发现",
  strengthsTitle: "保持得好的地方",
  watchoutsTitle: "需要留意",

  // ── Module headers ────────────────────────────────────────────────
  sleepModuleTitle: "睡眠",
  recoveryModuleTitle: "恢复",
  activityModuleTitle: "活动与训练",
  bodyModuleTitle: "身体成分",
  dataPrefix: "数据",

  // ── Sleep module aside ────────────────────────────────────────────
  sleepRecent30dLabel: "近 30 天睡眠",
  sleepRecent30dAwakeLabel: "近 30 天清醒",
  sleepBedtimeWakeLabel: "中位入睡 / 起床",
  sleepRecentNote: "近期",
  meanNote: "均值",

  // ── Sleep legend ──────────────────────────────────────────────────
  legendSleepDuration: "睡眠时长",
  legendDeepPct: "深睡占比",
  legendRemPct: "REM 占比",

  // ── Heading labels for note blocks ────────────────────────────────
  normalRangeAssessment: "参考区间说明",
  healthAdvice: "可执行建议",
  doctorQuestions: "就诊参考问题",
  sourceCoverage: "来源与覆盖",

  // ── Recovery table headers ────────────────────────────────────────
  thMetric: "指标",
  thLatest: "最新",
  thRecent30d: "近 30 天",
  thBaseline: "基线",
  thDelta: "变化",
  thTrend: "趋势",
  recoveryTableCaption: "恢复指标的最新值、近 30 天均值、90 天基线与变化",

  // ── Recovery row labels ───────────────────────────────────────────
  rowRestingHr: "静息心率",
  rowHrv: "HRV",
  rowOxygen: "血氧",
  rowRespiratoryRate: "呼吸频率",
  rowVo2Max: "最大摄氧量",

  // ── Activity section ──────────────────────────────────────────────
  legendActivityEnergy: "日常活动能量",
  legendExerciseMin: "锻炼分钟",
  legendStandHours: "站立小时",
  activityEnergyRecent: "近 30 天日常活动能量",
  activityExerciseRecent: "近 30 天锻炼",
  activityStandRecent: "近 30 天站立",
  whoAssessment: "每周活动参考",

  // ── Body composition ──────────────────────────────────────────────
  bodyDataInsufficient: "身体成分数据不足。",

  // ── Menstrual cycle ───────────────────────────────────────────────
  legendCycleLength: "周期长度",
  legendPeriodDuration: "经期天数",
  menstrualAvgCycleLabel: "平均周期",
  menstrualAvgPeriodLabel: "平均经期",
  menstrualCycleTrendLabel: "周期趋势",
  menstrualTrendLengthening: "延长中",
  menstrualTrendShortening: "缩短中",
  menstrualTrendStable: "稳定",
  menstrualBleedingPatternTitle: "出血模式分析",
  menstrualCycleCount: (count: number) => `${count} 个周期`,

  // ── Actions ───────────────────────────────────────────────────────
  actionsNext2Weeks: "接下来两周建议",
  actionsPriority: "优先行动",
  actionsSeekCare: "何时建议复查或就医",
  actionsDoctorQuestions: "下次看诊可以问医生的问题",

  // ── Appendix ──────────────────────────────────────────────────────
  appendixTitle: "数据边界与补充提示",
  appendixDataLimitations: "数据局限",
  appendixSourceConfidence: "数据覆盖与来源一致性",

  // ── Date range display ────────────────────────────────────────────
  windowStart: "起始",

  // ── Chart aria labels (chartSvg.ts) ───────────────────────────────
  sparklineAriaLabel: (label: string) => `${label} 迷你趋势图`,
  barChartAriaLabel: (label: string) => `${label} 柱状图`,
  lineChartAriaLabel: "趋势图",
  chartSeriesAriaSummary: (
    label: string,
    count: number,
    firstLabel: string,
    firstValue: string,
    latestLabel: string,
    latestValue: string,
    minValue: string,
    maxValue: string,
  ) =>
    `${label}：共 ${count} 个数据点；首个 ${firstLabel} 为 ${firstValue}；最新 ${latestLabel} 为 ${latestValue}；范围 ${minValue} 至 ${maxValue}。`,
  chartNoDataAriaSummary: "没有可供汇总的数值数据点。",
  chartGranularityNote:
    "横轴按真实时间显示，并按整段跨度使用统一粒度：90 天内按日、2 年内按周、更长历史按月汇总，避免把不同时间尺度挤在同一张图里。",

  // ── Cross-report navigation ───────────────────────────────────────
  crossReportTraining: "运动报告",
  crossReportHealth: "健康报告",

  // ── Markdown-specific strings ─────────────────────────────────────
  mdReportTitle: "Apple Health 健康报告",
  mdAssessmentTitle: "近期数据小结",
  mdCompositeScore: "综合评分",
  mdOverallStatus: "整体状态",
  mdCrossMetricTitle: "跨指标模式",
  mdBehavioralPatterns: "行为模式",
  mdOverviewTitle: "概览",
  mdKeyFindings: "关键发现",
  mdStrengths: "做得好的地方",
  mdWatchouts: "需要重点留意",
  mdActionsNext2Weeks: "接下来两周建议",
  mdSeekCare: "何时建议复查或就医",
  mdDoctorQuestions: "下次看诊可以问医生的问题",
  mdDataLimitations: "数据局限",
  mdDataRangeTitle: "数据范围",
  mdExportDate: "导出日期",
  mdExportDateUnknown: "未知",
  mdAnalysisWindow: "分析窗口",
  mdRecordCount: "记录数",
  mdWorkoutCount: "训练数",
  mdActivitySummaryCount: "活动摘要数",
  mdPrimarySourcesTitle: "主数据源",
  mdPrimarySleep: "睡眠",
  mdPrimaryRecovery: "恢复",
  mdPrimaryBody: "身体成分",
  mdPrimaryActivity: "活动",
  mdPrimarySeparator: "，",
  mdRiskSignalsTitle: "确定性信号",
  mdChartInterpretationTitle: "图表解读",
  mdChartCurrentValue: (value: string) => `当前主序列最近值为 ${value}。`,
  mdHistoricalTitle: "长期历史参照",
  mdHistoricalSpan: (days: number, earliest: string, latest: string) =>
    `历史跨度：约 ${days} 天（${earliest} -> ${latest}）`,
  mdHistoricalSleep: (recent: string, trailing: string, allTime: string) =>
    `睡眠：近 30 天 ${recent}，过去 180 天 ${trailing}，全时段 ${allTime}`,
  mdHistoricalRecovery: (rhrRecent: string, rhrAll: string, hrvRecent: string, hrvAll: string) =>
    `恢复：静息心率近 30 天 ${rhrRecent}，全时段 ${rhrAll}；HRV 近 30 天 ${hrvRecent}，全时段 ${hrvAll}`,
  mdHistoricalActivity: (recent: string, trailing: string, allTime: string) =>
    `活动：近 30 天锻炼 ${recent}，过去 180 天 ${trailing}，全时段 ${allTime}`,
  mdHistoricalBody: (weightRecent: string, weightAll: string, fatRecent: string, fatAll: string) =>
    `身体成分：体重近 30 天 ${weightRecent}，全时段 ${weightAll}；体脂率近 30 天 ${fatRecent}，全时段 ${fatAll}`,
  mdInterpretationHintPrefix: "解读提示：",
  mdStructuredFactsTitle: "结构化事实快照",
  mdFactSleep: (recent: string, baseline: string, delta: string) =>
    `睡眠：近 30 天 ${recent}，基线 ${baseline}，变化 ${delta}`,
  mdFactRecovery: (rhr: string, hrv: string) =>
    `恢复：静息心率 ${rhr}，HRV ${hrv}`,
  mdFactActivity: (exercise: string, workouts: number) =>
    `活动：近 30 天锻炼 ${exercise}，训练 ${workouts} 次`,
  mdFactBody: (weight: string, fat: string) =>
    `身体成分：体重 ${weight}，体脂率 ${fat}`,
  mdFactSleepInterpretation: "睡眠解读：",
  mdFactSleepNormalRange: "睡眠参考区间：",
  mdFactRecoveryInterpretation: "恢复解读：",
  mdFactRecoveryNormalRange: "恢复参考区间：",
  mdFactActivityInterpretation: "活动解读：",
  mdFactActivityNormalRange: "活动参考口径：",
  mdFactMenstrualCycle: (avg: string, period: string, total: number) =>
    `生理周期：平均 ${avg}，经期 ${period}，共 ${total} 个周期`,
  mdFactMenstrualInterpretation: "生理周期解读：",
  mdFactMenstrualNormalRange: "参考区间说明：",
  mdDisclaimerTitle: "免责声明",

  // ── Score labels (markdown) ───────────────────────────────────────
  mdScoreSleep: (score: number) => `睡眠 ${score}/100`,
  mdScoreRecovery: (score: number) => `恢复 ${score}/100`,
  mdScoreActivity: (score: number) => `活动 ${score}/100`,

  // ── Unit suffixes ────────────────────────────────────────────────
  unitHours: " 小时",
  unitMinutes: " 分钟",
  unitDays: " 天",

  // ── Footer ────────────────────────────────────────────────────────
  footerTagline: "Apple Health 数据分析 · 原始导出在本地解析",
  projectBoundary: "独立开源项目，与 Apple 无隶属关系",
};

export type RenderT = typeof renderZh;
