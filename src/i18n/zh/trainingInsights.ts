export const trainingInsightsZh = {
  trainingLoadChartTitle: "训练负荷趋势（42 日基线 · 7 日近期 · 负荷差）",
  trainingLoadChartSubtitle:
    "以 MET·分钟估算训练量：CTL 是 42 日 EWMA 基线，ATL 是 7 日 EWMA 近期负荷，TSB = CTL − ATL。该差值用于比较个人近期与长期训练量，不单独代表疲劳或恢复状态。",
  ctlSeriesLabel: "42 日负荷基线 (CTL)",
  atlSeriesLabel: "7 日近期负荷 (ATL)",
  tsbSeriesLabel: "负荷差 (TSB)",
  trainingRecoveryChartTitle: "训练时长与恢复背景指数",
  trainingRecoveryChartSubtitle:
    "各序列统一换算为指数，100 代表近 12 个月有记录月份的平均值，高于 100 表示高于该序列的个人记录常态。",
  trainingLoadIndexLabel: "训练时长指数",
  sleepSupportIndexLabel: "睡眠支持指数",
  hrvSupportIndexLabel: "HRV 支持指数",
  restingHeartRateSupportIndexLabel: "静息心率支持指数",
  sportTrendChartTitle: (sport: string) => `${sport} 月度节奏`,
  sportTrendChartSubtitle: "柱状 = 每月训练次数（左轴）；折线 = 每次平均时长（右轴）。次数反映频率，平均时长反映单次训练规模，两个维度组合起来比单看一个更能判断节奏变化。",
  workoutCountLabel: "月度训练次数",
  avgWorkoutDurationLabel: "平均单次时长",
  chartUnitSessions: "次",
  chartUnitMinutes: "分钟",
  chartUnitIndex: "指数",
  chartUnitMetMinutes: "MET·分钟",
  metadataLanguage: "zh-CN",
  outputSchemaVersion: "2.0.0",
  narrativeAudience: "普通用户",
  narrativeGoal:
    "基于 Apple Health 中的训练记录、睡眠和恢复数据，输出中文训练状态报告，帮助用户理解运动节奏、负荷变化和恢复证据。",
  narrativeBoundaries: [
    "只能引用 summary.json 和 insights.json 中的事实",
    "优先说明训练节奏、负荷变化、运动项目状态与恢复证据",
    "可以给出训练调整和健康管理建议，但不能生成竞技处方或医学诊断",
    "对 Apple Health 无法稳健还原的 Garmin 专有指标，不要伪造具体分数",
    "明显异常时可以给出保守的复查或就医提醒",
  ],
};

export type TrainingInsightsT = typeof trainingInsightsZh;
