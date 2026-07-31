export const sleepZh = {
  // ── Separators ──
  partSep: "；",
  partEnd: "。",
  sentSep: "。",

  // ── analyzeSleep ──
  noSleepRecords: "所选时间窗口内没有可用的睡眠记录。",
  stagedNote: "睡眠阶段占比仅基于选定的主睡眠数据源计算。",
  unstagedNote: "选定的睡眠数据源不提供分阶段睡眠数据。",
  partialNightWarning: (nightKey: string, hours: number) =>
    `已将 ${nightKey} 排除在睡眠趋势之外，因为该夜晚仅包含 ${hours} 小时睡眠。`,

  // ── buildDeepSleepAssessment ──
  deepSleepNoData: "当前数据源不提供睡眠阶段数据，无法评估深度睡眠占比。",
  deepSleepObserved: (deep: number) =>
    `设备估算的深度睡眠占比为 ${deep}%；这是算法分类结果，更适合观察个人长期趋势，不能据此判断恢复质量或睡眠疾病。`,

  // ── buildRemSleepAssessment ──
  remSleepNoData: "当前数据源不提供睡眠阶段数据，无法评估 REM 睡眠占比。",
  remSleepObserved: (rem: number) =>
    `设备估算的 REM 睡眠占比为 ${rem}%；这是算法分类结果，建议以个人长期趋势为主，不从单次比例推断原因。`,

  // ── buildNormalRangeAssessment ──
  normalRangeInsufficientData: "数据不足，无法评估。",

  avgSleepObserved: (avg: number) =>
    `近 30 天平均记录睡眠 ${avg} 小时；是否足够应结合个人需求、白天状态和长期基线`,
  sleepStagesObserved: (deep: number | null, rem: number | null) =>
    `设备估算深度睡眠 ${deep ?? "—"}%、REM ${rem ?? "—"}%；阶段比例仅用于个人趋势观察`,
  bedtimeObserved: (bedtime: string) =>
    `中位入睡时间 ${bedtime}；是否合适应结合起床时间、总睡眠、规律性和个人作息`,

  // ── buildInterpretation ──
  interpretationInsufficientData: "记录不足，暂时无法给出综合解读。建议持续记录至少 7 个夜晚。",

  durationContext: (avg: number) =>
    `近 30 天平均记录睡眠 ${avg} 小时；本报告不按单一固定区间判断是否适合个人`,

  // Trend
  trendImproving: (delta: number) =>
    `近期记录的睡眠时长比基线期增加了约 ${delta} 小时；是否构成改善还需结合规律性和白天状态`,
  trendDeclining: (delta: number) =>
    `近期记录的睡眠时长比基线期减少了约 ${delta} 小时；若同时出现白天困倦或注意力下降，两者可能相关但不能仅凭记录确定原因`,
  trendStable: "近期睡眠时长与基线期保持稳定，没有明显波动",

  // ── buildActionableAdvice ──
  adviceSleepMore: "尝试将就寝时间提前 15-30 分钟，逐步增加总睡眠时长——急剧改变作息反而难以坚持。",
  adviceDeclining: "近期睡眠呈下降趋势，建议排查影响因素：工作压力、屏幕时间、咖啡因摄入或运动时间是否有变化。",
  adviceBedtimeLate: "入睡时间偏晚时，优先固定适合生活安排的起床时间，并逐步调整就寝时间以保证足够总睡眠。",
  adviceGood: "现有睡眠记录较稳定，可继续保持适合自己的规律作息和舒适睡眠环境。",
  adviceConsistentWake: "尽量保持相对稳定且符合生活安排的起床时间，包括周末；若需要调整，可逐步进行。",

  // ── buildDoctorTalkingPoints ──
  doctorLowSleep: (avg: number) =>
    `"我的平均睡眠只有 ${avg} 小时，长期如此是否需要做睡眠质量评估？"`,
  doctorDeclining: (delta: number) =>
    `"我的睡眠时长近期下降了约 ${delta} 小时，这种变化需要关注吗？"`,
};
export type SleepT = typeof sleepZh;
