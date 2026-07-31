export const commonZh = {
  insufficientData: "数据不足",
  insufficientDataFull: "数据不足，无法评估。",
  insufficientInterpretation: "记录不足，暂时无法给出综合解读。",
  partSeparator: "；",
  partEnding: "。",
  sentenceSeparator: "。",
  hours: "小时",
  minutes: "分钟",
  days: "天",
  times: "次",
  sleep: "睡眠",
  recovery: "恢复",
  activity: "活动",
  bodyComposition: "身体成分",
  menstrualCycle: "生理期",
  timestampDataQualityWarning: (count: number) =>
    `已隔离 ${count} 条时间戳无效或明显异常的记录；原始计数保留在 coverage 中，未用于分析。`,
  unsupportedUnitWarning: (count: number) =>
    `已忽略 ${count} 个无法安全换算单位的数值；原始计数保留在 coverage 中，避免错误标注。`,
  duplicateWorkoutWarning: (count: number) =>
    `分析前已合并 ${count} 条跨来源近似重复的运动记录；coverage 中仍保留原始运动记录总数。`,
};
export type CommonT = typeof commonZh;
