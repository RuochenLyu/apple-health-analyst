export const crossMetricZh = {
  // ── Separators ──
  partSep: "；",
  partEnd: "。",
  sentSep: "。",

  // ── Sleep-Recovery Link ──────────────────────────────────────────

  sleepRecoveryNoShortNights:
    "近期没有睡眠不足 6 小时的夜晚，睡眠时长保障较好。",

  sleepRecoveryHrvDrop: (
    shortDays: number,
    hrvDrop: number,
    shortHRV: number,
    normalHRV: number,
  ) =>
    `睡眠不足 6 小时的 ${shortDays} 个夜晚中，次日 HRV 均值比正常睡眠后低 ${Math.abs(hrvDrop)}%（${shortHRV} vs ${normalHRV} ms）。这是当前样本中的关联，不代表因果关系。`,

  sleepRecoveryNoHrvData: (
    shortDays: number,
    shortPairedDays: number,
    normalPairedDays: number,
  ) =>
    `有 ${shortDays} 个夜晚睡眠不足 6 小时，但短睡/正常睡眠后的次日 HRV 配对样本分别只有 ${shortPairedDays}/${normalPairedDays} 天，暂不足以判断二者是否存在稳定关联。`,

  sleepRecoveryTolerable: (shortDays: number) =>
    `有 ${shortDays} 个夜晚睡眠不足 6 小时；在当前配对样本中，次日 HRV 未观察到超过 5% 的稳定下降。该结果不表示短睡没有影响。`,

  // ── Sleep Consistency ────────────────────────────────────────────

  sleepConsistencyInsufficient: "作息规律性数据不足，无法评估。",

  sleepConsistencyHigh: (bedStd: number, wakeStd: number) =>
    `入睡时间标准差约 ${bedStd} 分钟，起床标准差约 ${wakeStd} 分钟，当前记录中的作息节律较稳定。`,

  sleepConsistencyModerate: (bedStd: number, wakeStd: number) =>
    `入睡时间标准差约 ${bedStd} 分钟，起床标准差约 ${wakeStd} 分钟，作息有一定波动。建议优先固定起床时间，入睡时间会自然趋于稳定。`,

  sleepConsistencyLow: (bedStd: number, wakeStd: number) =>
    `入睡时间标准差约 ${bedStd} 分钟，起床标准差约 ${wakeStd} 分钟，当前记录中的作息波动较大；可结合总睡眠和白天状态观察是否需要调整。`,

  // ── Activity-Recovery Balance ────────────────────────────────────

  activityRecoveryNoHighStrain:
    "近期没有高运动量天（≥60 分钟），无法评估训练-恢复平衡。",

  activityRecoveryInsufficientHrv: (highStrainDays: number) =>
    `有 ${highStrainDays} 天运动量较高，但 HRV 数据不足以判断恢复充分性。`,

  activityRecoveryAdequate: (
    highStrainDays: number,
    highHRV: number,
    restHRV: number,
  ) =>
    `有 ${highStrainDays} 天高运动量；在可配对样本中，次日 HRV 均值 ${highHRV} ms，接近低运动量日后的 ${restHRV} ms，暂未观察到稳定的恢复下降关联。`,

  activityRecoveryInadequate: (
    highStrainDays: number,
    highHRV: number,
    restHRV: number,
  ) =>
    `有 ${highStrainDays} 天高运动量；在可配对样本中，次日 HRV 均值 ${highHRV} ms，低于低运动量日后的 ${restHRV} ms，提示两者可能相关但不能证明因果。可结合主观疲劳和后续趋势决定是否调整训练。`,

  // ── Recovery Coherence ───────────────────────────────────────────

  recoveryCoherenceInsufficient: "恢复指标数据不足，无法判断趋势一致性。",

  recoveryCoherenceAligned: (
    rhrTrend: string,
    hrvTrend: string,
  ) =>
    `静息心率${rhrTrend === "improving" ? "下降" : "稳定"}，HRV ${hrvTrend === "improving" ? "上升" : "稳定"}，两项个人恢复指标方向一致；这不等同于对自主神经状态的临床判断。`,

  recoveryCoherenceBothWorsening:
    "静息心率上升且 HRV 下降，与近期恢复支持走弱方向一致；可复核压力、睡眠、训练量和测量条件，但不能仅凭这些记录确定原因。",

  recoveryCoherenceMixed: (rhrTrend: string, hrvTrend: string) =>
    `静息心率趋势为"${rhrTrend}"，HRV 趋势为"${hrvTrend}"，两项指标方向不完全一致，建议观察是否存在混合压力源（如训练增加但睡眠改善）。`,

  // Recovery trend labels (used inside recoveryCoherenceMixed)
  trendImproving: "improving",
  trendWorsening: "worsening",
  trendStable: "stable",

  // ── Composite Assessment ─────────────────────────────────────────

  readinessGood: "良好",
  readinessModerate: "中等",
  readinessLow: "偏低",
  readinessInsufficientData: "数据不足",

  compositeSleep: (score: number) => `睡眠 ${score}/100`,
  compositeRecovery: (score: number) => `恢复 ${score}/100`,
  compositeActivity: (score: number) => `活动 ${score}/100`,

  compositeSummary: (
    scoresPart: string,
    readinessLabel: string,
  ) =>
    `综合评分：${scoresPart}。整体状态${readinessLabel}。`,

  compositeScoreSeparator: "、",

  compositeLowAdvice: "建议优先改善睡眠和恢复，暂缓增加训练强度。",
  compositeModerateAdvice: "有改善空间，重点关注评分最低的维度。",
  compositeGoodAdvice: "各维度记录较稳定，可维持当前节奏，并继续结合主观感受观察。",

  compositeInsufficientDimensions:
    "本报告不生成未经验证的综合健康分；请直接查看各指标的个人趋势、样本覆盖和数据缺口。",

  // ── Pattern Detection ────────────────────────────────────────────

  patternWeekendWarrior: (
    weekendAvg: number,
    weekdayAvg: number,
    ratio: number,
  ) =>
    `周末集中运动模式：周末平均运动 ${weekendAvg} 分钟，是工作日 ${weekdayAvg} 分钟的 ${ratio} 倍。这只描述时间分布，不表示锻炼收益更差；如果周末单次负荷过大，可在工作日加入轻量活动来分散负荷。`,

  patternNightOwlDrift: (driftMin: number) =>
    `入睡时间后移：分析期内平均后移约 ${driftMin} 分钟。这描述的是钟表时间变化；若希望把作息前移，可从稳定起床时间和晨间自然光开始尝试。`,

  patternSleepDebtCompensation: (weekdayAvg: string, weekendAvg: string) =>
    `工作日/周末睡眠差异：工作日平均 ${weekdayAvg} 小时，周末 ${weekendAvg} 小时。该差异可能反映日程约束或补觉习惯；可优先观察工作日是否获得足够且可持续的睡眠。`,

  patternRecoveryDeficit: (maxConsecutive: number) =>
    `连续 ${maxConsecutive} 天运动量较高（≥45 分钟），期间没有低运动量日。仅凭运动时长不能判断恢复不足；如同时出现主观疲劳、睡眠变差或恢复指标走弱，可考虑安排轻量日。`,

  // ── Notable Days ─────────────────────────────────────────────────

  notableSleepDuration: "睡眠时长",
  notableHRV: "HRV",
  notableRHR: "静息心率",
  notableExercise: "锻炼时长",

  notableUnitHours: "小时",
  notableUnitMs: "ms",
  notableUnitBpm: "bpm",
  notableUnitMinutes: "分钟",

  notableDayContext: (avg: number, unit: string) => `均值 ${avg} ${unit}`,
};

export type CrossMetricT = typeof crossMetricZh;
