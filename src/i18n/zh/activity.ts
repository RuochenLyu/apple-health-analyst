export const activityZh = {
  workoutLabelLocale: "zh" as const,
  // ── Separators ──
  partSep: "；",
  partEnd: "。",
  sentSep: "。",

  // ── analyzeActivity ──
  source: "活动摘要 + 训练记录",
  activeNote: "日常活动趋势来自活动摘要，训练类型单独统计。",
  noDataNote: "所选时间窗口内没有可用的活动摘要或训练记录。",

  // ── buildWhoGuidelineAssessment ──
  whoNoData: "没有可用的 Apple 锻炼时间记录，无法提供每周活动背景。",
  exerciseGuidelineContext: (weeklyMinutes: number) =>
    `Apple 锻炼时间折算约 ${weeklyMinutes} 分钟/周。该字段不能完整确认活动强度或未记录的运动，因此不能据此计算 WHO 达标差距，也不据此生成运动处方。`,

  // ── buildWorkoutVariety ──
  varietyNone: "近期没有记录训练类型。",
  varietySingle: (type: string) =>
    `运动类型较单一（仅 ${type}），建议搭配不同类型的运动，如有氧 + 力量 + 柔韧性训练，以获得更全面的健康收益。`,
  varietyBalanced: (types: string) =>
    `近期记录包含多种运动（${types}）；多样性描述运动构成，不单独代表训练是否均衡或损伤风险更低。`,
  varietyRich: (types: string, count: number) =>
    `近期记录包含 ${count} 种运动（${types} 等）；应结合各类型的频率、强度和个人目标判断组合是否合适。`,

  // ── buildNormalRangeAssessment ──
  exerciseRecorded: (dailyMin: number, weeklyMin: number) =>
    `Apple 锻炼时间日均 ${dailyMin} 分钟（折算约 ${weeklyMin} 分钟/周）；适合观察个人趋势，不等同于按强度分类的活动分钟`,

  standMeetsGoal: (hours: number) =>
    `日均约 ${hours} 个小时达到 Apple“站立小时”的记录条件`,
  standReasonable: (hours: number) =>
    `日均约 ${hours} 个小时达到 Apple“站立小时”的记录条件；这不是实际站立总时长`,
  standLow: (hours: number) =>
    `日均约 ${hours} 个小时达到 Apple“站立小时”的记录条件；记录较少，但不能据此计算总久坐时长`,

  activeEnergyBurned: (kcal: number) =>
    `日均活动消耗 ${kcal} kcal`,

  normalRangeInsufficientData: "活动数据不足，无法评估。",

  // ── buildInterpretation ──
  interpretationInsufficientData: "记录不足，暂时无法给出综合解读。",

  exerciseInterpretation: "Apple 锻炼时间可用于观察个人活动趋势，但不能单独判定公共健康指南是否达标",

  trendImproving: (delta: number) =>
    `近期记录的日均运动比基线期增加了约 ${delta} 分钟`,
  trendDeclining: (delta: number) =>
    `近期日均运动比基线期减少了约 ${delta} 分钟，如果非有意为之，建议关注是否有时间或动力方面的障碍`,
  trendStable: "运动量保持稳定，一致性是长期获益的关键",

  sedentaryWarning: "达到 Apple“站立小时”条件的小时数较少；这提示可关注日间活动间隔，但不能直接量化久坐时长",

  // ── buildActionableAdvice ──
  adviceStandMore: "可设置活动提醒，在长时间静坐或伏案期间定期起身；Apple“站立小时”只能记录是否在该小时内活动过。",
  adviceDeclining: "运动量呈下降趋势，建议找一个运动伙伴或设定具体的运动日程表，外部约束比意志力更可靠。",
  adviceCrossTrain: "若符合个人目标，可尝试每周加入一次不同类型的运动，并从低强度开始观察适应情况。",
  adviceGood: "现有记录中的运动节奏较稳定；是否维持或调整组合应结合个人目标、疲劳和疼痛。",
  adviceTrack: "继续用现有设备或应用记录运动，有助于观察个人趋势；解读时同时记录运动类型、强度、疲劳和疼痛。",
};
export type ActivityT = Omit<typeof activityZh, "workoutLabelLocale"> & {
  workoutLabelLocale: "zh" | "en";
};
