// ── Insight builder translations (Chinese) ─────────────────────────
// This file is the "source of truth" for InsightsT.

export const insightsZh = {
  // ── Metric labels ─────────────────────────────────────────────────
  restingHeartRateLabel: "静息心率",
  hrvLabel: "HRV",
  oxygenSaturationLabel: "血氧",
  respiratoryRateLabel: "呼吸频率",
  vo2MaxLabel: "最大摄氧量",
  bodyMassLabel: "体重",
  bodyFatPercentageLabel: "体脂率",

  // ── Chart titles & subtitles ──────────────────────────────────────
  sleepChartTitle: "睡眠时长与阶段趋势",
  sleepChartSubtitle:
    "图表按完整时间跨度统一使用日、周或月粒度，避免混合时间尺度造成近期数据拥挤。",
  recoveryChartTitle: "恢复指标对比",
  recoveryChartSubtitle:
    "每项恢复指标保持原始单位，便于在网页中分别展示近期曲线和最新值。",
  activityChartTitle: "活动趋势",
  activityChartSubtitle:
    "活动摘要负责日常活动量，训练记录单独统计，避免把不同来源强行混成一个分数。",
  bodyChartTitle: "身体成分趋势",
  bodyChartSubtitle:
    "优先使用最稳定的体重秤来源，近期变化可以直接对应到体重和体脂两条曲线。",
  menstrualChartTitle: "生理周期趋势",
  menstrualChartSubtitleWithAvg: (periods: number, avgDays: number) =>
    `共追踪 ${periods} 个周期，平均周期 ${avgDays} 天。`,
  menstrualChartSubtitleNoAvg: (periods: number) =>
    `共追踪 ${periods} 个经期。`,

  // ── Chart series labels ───────────────────────────────────────────
  sleepHoursLabel: "睡眠时长",
  sleepHoursUnit: "小时",
  deepSleepPctLabel: "深睡占比",
  remSleepPctLabel: "REM 占比",
  activityEnergyLabel: "活动能量",
  exerciseMinutesLabel: "锻炼分钟",
  exerciseMinutesUnit: "分钟",
  standHoursLabel: "站立小时",
  standHoursUnit: "小时",
  workoutCountLabel: "训练次数",
  workoutCountUnit: "次",
  cycleLengthLabel: "周期长度",
  cycleLengthUnit: "天",
  periodDurationLabel: "经期天数",
  periodDurationUnit: "天",

  // ── Source confidence summaries ───────────────────────────────────
  sleepConfidenceSummary: (source: string, days: number, staged: boolean) =>
    `睡眠主数据源为 ${source}，近 30 天覆盖 ${days} 个夜晚${staged ? "，包含分阶段睡眠" : ""}。`,
  sleepConfidenceInsufficient: "睡眠数据不足，趋势解读可信度较低。",
  recoveryConfidenceSummary: (recentCount: number, totalCount: number, sources: string) =>
    `近 30 天 ${totalCount} 项已选恢复指标中有 ${recentCount} 项有记录，主要来自 ${sources}。`,
  recoveryConfidenceInsufficient: "恢复指标覆盖不足，无法把握恢复趋势。",
  activityConfidenceSummary: (days: number, workouts: number) =>
    `近 30 天活动摘要覆盖 ${days} 天，训练 ${workouts} 次。`,
  activityConfidenceInsufficient: "活动摘要或训练记录不足，活动趋势只能谨慎参考。",
  bodyConfidenceSummary: (recentCount: number, totalCount: number, sources: string) =>
    `近 30 天 ${totalCount} 项已选身体成分指标中有 ${recentCount} 项有记录，来自 ${sources}。`,
  bodyConfidenceDefaultSource: "已选主数据源",
  bodyConfidenceInsufficient: "身体成分样本不足，体重和体脂建议只看方向，不看细小波动。",
  menstrualConfidenceSummary: (periods: number, days: number) =>
    `生理周期数据覆盖 ${periods} 个周期，${days} 天记录。`,

  // ── Data gaps ─────────────────────────────────────────────────────
  sleepInsufficientGap: "睡眠夜数偏少，近期与基线的比较稳定性有限。",
  sleepPartialNightsGap: (count: number) =>
    `已有 ${count} 个睡眠夜晚因记录不完整被排除。`,
  recoveryMetricMissingGap: (label: string) =>
    `${label} 缺少足够近期样本。`,
  activitySparseGap: "近期活动摘要覆盖天数偏少，活动趋势更适合看大方向。",
  bodyMetricMissingGap: (label: string) =>
    `${label} 缺少足够近期样本。`,
  menstrualSparseGap: "生理周期记录较少，周期规律性评估可信度有限。",

  // ── Risk flag titles ──────────────────────────────────────────────
  sleepDeclineTitle: "近期睡眠时长下降",
  sleepDeclineSummary:
    "近 30 天平均睡眠时长明显低于个人基线，优先检查作息、入睡时间和恢复安排。",
  sleepDeclineEvidence: (recent: string, baseline: string) => [
    `近 30 天平均 ${recent} 小时`,
    `基线 90 天平均 ${baseline} 小时`,
  ],
  sleepDeclineRecommendation: "先稳住睡眠窗口和起床时间，再考虑提高训练负荷。",

  recoveryStressTitle: "恢复信号偏紧",
  recoveryStressSummary:
    "静息心率上升且 HRV 下滑，与近期压力增加或恢复支持走弱方向一致，但不能仅凭设备数据确定原因。",
  recoveryStressEvidence: (hrDelta: string, hrvDelta: string) => [
    `静息心率变化 ${hrDelta}`,
    `HRV 变化 ${hrvDelta}`,
  ],
  recoveryStressRecommendation:
    "结合疲劳、疼痛和训练计划考虑暂时减少高强度训练，并优先保证睡眠和补水，观察后续趋势。",

  oxygenLowTitle: "血氧读数偏低",
  oxygenLowSummary:
    "近 30 天多次设备血氧读数的平均值偏低，应优先确认佩戴和测量条件，并留意是否伴随不适。",
  oxygenLowEvidence: (value: string) => [`近 30 天平均血氧 ${value}`],
  oxygenLowRecommendation:
    "先复测并核对设备佩戴情况，若持续偏低或伴随症状，应尽快咨询专业医生。",

  activityDropTitle: "近期活动量下降",
  activityDropSummary:
    "记录的锻炼分钟数较基线明显回落；现有数据不能判断原因或对身体状态的影响。",
  activityDropEvidence: (recent: string, baseline: string) => [
    `近 30 天平均锻炼 ${recent} 分钟`,
    `基线 90 天平均锻炼 ${baseline} 分钟`,
  ],
  activityDropRecommendation: "优先恢复固定活动节奏，而不是一次性补量。",

  bodyMassShiftTitle: "体重变化较快",
  bodyMassShiftSummary:
    "近 30 天体重相对个人基线变化较快，建议结合饮食、训练负荷和主观状态一起判断。",
  bodyMassShiftEvidence: (delta: string) => [`体重变化 ${delta}`],
  bodyMassShiftRecommendation:
    "优先确认变化是否符合预期，再结合体脂、活动量和恢复信号判断。",

  bodyFatShiftTitle: "体脂率变化值得复核",
  bodyFatShiftSummary:
    "体脂率变化幅度已经值得单独关注，尤其需要结合测量时段和设备一致性。",
  bodyFatShiftEvidence: (delta: string) => [`体脂率变化 ${delta}`],
  bodyFatShiftRecommendation:
    "尽量在固定条件下复测，避免把短期波动误判为稳定趋势。",

  menstrualIrregularTitle: "生理周期波动较大",
  menstrualIrregularSummary:
    "近期记录的生理周期波动较大；生活节奏、压力、营养和多种健康因素都可能相关，但记录不能确定原因。",
  menstrualIrregularEvidence: (std: string, avg: string) => [
    `周期标准差 ${std} 天`,
    `平均周期 ${avg} 天`,
  ],
  menstrualIrregularRecommendation:
    "继续记录周期与症状；若波动持续、备孕或伴随不适，可咨询妇科医生。",

  menstrualCycleLengthAbnormalTitle: "生理周期偏离参考范围",
  menstrualCycleLengthAbnormalSummary: (avg: number) =>
    `平均周期 ${avg} 天，偏离本报告采用的常见参考范围（21-38 天）；这不是诊断。`,
  menstrualCycleLengthAbnormalEvidence: (avg: number) => [
    `平均周期 ${avg} 天`,
  ],
  menstrualCycleLengthAbnormalRecommendation:
    "若持续偏离个人基线、备孕或伴随症状，可咨询妇科医生，由医生决定是否需要评估。",

  intermenstrualBleedingTitle: "经间期出血较频繁",
  intermenstrualBleedingSummary:
    "现有记录中经间期出血较频繁，建议留意是否重复、量增多或伴随其他症状。",
  intermenstrualBleedingEvidence: (count: number, freq: number) => [
    `经间期出血 ${count} 次`,
    `平均每周期 ${freq} 次`,
  ],
  intermenstrualBleedingRecommendation:
    "如果经间期出血持续、量增多或伴随疼痛，建议咨询妇科医生。",

  // ── Notable changes ───────────────────────────────────────────────
  sleepImprovedTitle: "睡眠时长较基线回升",
  sleepImprovedSummary: "近 30 天平均睡眠时长高于基线；是否构成恢复改善仍需结合规律性、白天状态和其他指标。",
  sleepImprovedEvidence: (delta: string, latest: string) => [
    `睡眠变化 ${delta} 小时`,
    `最新睡眠曲线末端约 ${latest} 小时`,
  ],

  restingHrImprovedTitle: "静息心率较基线更低",
  restingHrImprovedSummary:
    "静息心率相对个人基线更低，与近期恢复信号改善方向一致；仍需结合主观感受和其他指标。",
  restingHrImprovedEvidence: (delta: string) => [
    `静息心率变化 ${delta}`,
  ],

  hrvImprovedTitle: "HRV 高于基线",
  hrvImprovedSummary: "HRV 相对基线回升，与近期恢复信号改善方向一致；单项指标不能确定原因。",
  hrvImprovedEvidence: (delta: string) => [`HRV 变化 ${delta}`],

  hrvDeclinedTitle: "HRV 低于基线",
  hrvDeclinedSummary: "HRV 已低于近期个人基线，恢复负担值得重点留意。",
  hrvDeclinedEvidence: (delta: string) => [`HRV 变化 ${delta}`],

  activityUpTitle: "近期训练量回升",
  activityUpSummary: "锻炼分钟数比基线更高，近期训练执行度更强。",
  activityUpEvidence: (delta: string) => [`锻炼分钟变化 ${delta} 分钟`],

  bodyMassDownTitle: "体重呈下降趋势",
  bodyMassDownSummary:
    "近 30 天体重低于基线，适合结合活动量和主观状态判断是否符合预期。",
  bodyMassDownEvidence: (delta: string, latest: string) => [
    `体重变化 ${delta}`,
    `最新体重约 ${latest}`,
  ],

  menstrualRegularTitle: "生理周期规律",
  menstrualRegularSummary: (avg: number, std: number) =>
    `平均周期 ${avg} 天，标准差 ${std} 天，周期稳定。`,
  menstrualRegularEvidence: (periods: number, std: number) => [
    `共 ${periods} 个周期`,
    `标准差 ${std} 天`,
  ],

  menstrualCycleShiftTitle: "生理周期长度变化",
  menstrualCycleShiftSummary: (recent: number, historical: number, delta: string) =>
    `近 90 天平均周期 ${recent} 天，历史平均 ${historical} 天，变化 ${delta} 天。`,
  menstrualCycleShiftEvidence: (recent: number, historical: number) => [
    `近 90 天均值 ${recent} 天`,
    `历史均值 ${historical} 天`,
  ],

  // ── Interpretation hints ──────────────────────────────────────────
  hintSleepBelowLongTerm: (diff: number) =>
    `近期睡眠时长低于长期平均 ${diff} 小时，优先级应高于继续加训练量。`,
  hintSleepAboveLongTerm: (diff: number) =>
    `近期睡眠时长高于长期平均 ${diff} 小时，最近用于睡眠的时间比长期状态更多；恢复质量仍需结合其他指标。`,
  hintRecoveryStress:
    "静息心率高于长期平均且 HRV 低于长期平均，常见于恢复负荷偏高、压力上升或近期节奏失衡。",
  hintRecoveryRelaxed:
    "恢复指标相对长期平均呈较有利方向，但仅凭设备指标不能判断睡眠、压力或训练安排是否可持续。",
  hintSleepImprovedRecoveryLagging:
    "睡眠改善已经先出现，但恢复指标还没有形成同方向共振，更适合继续稳住节奏而不是立刻加量。",
  hintActivityUpWeightDown:
    "活动量高于长期平均且体重低于长期平均，如果这是主动目标，当前方向较一致；若并非预期，则要留意摄入和恢复。",
  hintActivityDownWeightUp:
    "近期活动量低于长期平均而体重高于长期平均，更适合先恢复稳定活动与作息，再谈强度提升。",
  hintActivityUpRecoveryOk:
    "近期活动量高于长期平均，现有设备指标未显示明确的恢复恶化；这不等同于确认当前负荷可承受，仍需结合疲劳、疼痛和主观感受。",
  hintWeightDownActivityFlat:
    "体重低于长期平均，但活动提升并不明显；如果这不是主动减脂目标，建议回看饮食、睡眠和恢复是否一起在变化。",
  hintSparseModules:
    "历史跨度已经足够长，但最近部分模块记录偏稀疏，近期判断应优先依赖记录更连续的模块。",
  hintMenstrualRegular: (avg: number, std: number) =>
    `现有记录中的生理周期较规律（平均 ${avg} 天，标准差 ${std} 天）；这描述记录模式，不代表对激素状态的判断。`,
  hintMenstrualIrregular: (std: number) =>
    `生理周期不规律（标准差 ${std} 天），建议结合睡眠和压力数据综合判断，必要时咨询妇科医生。`,

  // ── Narrative context ─────────────────────────────────────────────
  narrativeAudience: "普通用户",
  narrativeGoal:
    "结合最近 30 天、过去 180 天和整个可用历史，生成中文健康管理报告，不做诊断。",
  narrativeBoundaries: [
    "只能引用 summary.json 和 insights.json 中的事实",
    "可以给出睡眠、恢复、活动、身体成分的健康管理建议",
    "优先结合 historicalContext 中的近 30 天、过去 180 天和全时段背景，不要只看单一窗口",
    "不要生成医学诊断、疾病判断或治疗方案",
    "遇到明显异常时可以给出保守的复查或就医提醒",
  ],

  // ── Activity source ───────────────────────────────────────────────
  activitySource: "活动摘要 + 训练记录",

  // ── Metadata ──────────────────────────────────────────────────────
  metadataLanguage: "zh-CN",
};

export type InsightsT = typeof insightsZh;
