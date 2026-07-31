export const menstrualCycleZh = {
  // ── Separators ──
  partSep: "；",
  partEnd: "。",
  sentSep: "。",

  // ── Notes ────────────────────────────────────────────────────────

  noteFewPeriods: "生理周期记录较少，周期规律性评估可信度有限。",

  noteContraceptiveUse: (contraceptiveUse: string) =>
    `检测到避孕方式记录（${contraceptiveUse}）；不同方式对周期的影响不同。`,

  noteIntermenstrualBleeding: (count: number) =>
    `检测到 ${count} 次经间期出血记录。`,

  // ── Warnings ─────────────────────────────────────────────────────

  warningIrregular: (cycleLengthStd: number) =>
    `生理周期不规律，周期标准差 ${cycleLengthStd} 天。`,

  warningCycleLengthOutOfRange: (avgCycleLength: number) =>
    `平均周期 ${avgCycleLength} 天，偏离本报告采用的常见参考范围（21-38 天）。`,

  // ── Flow Pattern Description ─────────────────────────────────────

  flowPatternHeavy: (heavyPct: number) =>
    `记录中重度出血占 ${heavyPct}%；Health 数据中的定性分级不能用于判断病因，若与个人常态不同或伴随不适可咨询医生`,

  flowPatternLight: (lightPct: number) =>
    `记录中轻度出血占 ${lightPct}%；定性分级受记录习惯影响，不据此推断激素或子宫内膜状态`,

  flowPatternBalanced: (lightPct: number, mediumPct: number, heavyPct: number) =>
    `记录的出血量分布为轻度 ${lightPct}%、中度 ${mediumPct}%、重度 ${heavyPct}%；这些分级用于趋势观察，不代表临床正常与否`,

  flowDurationLengthening:
    "近期经期天数呈延长趋势，如果伴随出血量增加，建议留意是否有贫血症状（疲劳、头晕）",

  flowDurationShortening:
    "近期经期天数有缩短趋势；压力、体重和多种健康因素可能相关，但现有记录不能判断原因",

  // ── Normal Range Assessment ──────────────────────────────────────

  normalRangeInsufficient: "数据不足，无法评估。",

  cycleLengthIdeal: (avgCycle: number) =>
    `平均周期 ${avgCycle} 天，处于本报告采用的常见参考范围（24-35 天）`,

  cycleLengthNormalButEdge: (avgCycle: number, direction: string) =>
    `平均周期 ${avgCycle} 天，在常见参考范围（21-38 天）内但靠近偏${direction}一侧；是否需要关注取决于个人基线和症状`,

  cycleLengthDirectionShort: "短",
  cycleLengthDirectionLong: "长",

  cycleLengthOutOfRange: (avgCycle: number) =>
    `平均周期 ${avgCycle} 天，超出常见参考范围（21-38 天）；若持续偏离个人基线或伴随症状，可咨询妇科医生`,

  periodDurationNormal: (avgDuration: number) =>
    `记录中的经期平均 ${avgDuration} 天，处于本报告采用的常见参考范围`,

  periodDurationShort: (avgDuration: number) =>
    `经期平均 ${avgDuration} 天，较短；建议先结合个人长期基线和记录完整度观察`,

  periodDurationLong: (avgDuration: number) =>
    `记录中的经期平均 ${avgDuration} 天，高于常见参考范围（3-7 天）；若同时出血量增多或出现疲劳、头晕等症状，请咨询医生`,

  regularityGood:
    "现有记录中的周期较规律；这描述的是记录模式，不足以单独判断内分泌功能",

  regularitySomewhatIrregular:
    "周期有一定波动；压力、睡眠变化、跨时区旅行等可能与短期变化同时出现，但记录本身不能确定原因",

  regularityIrregular:
    "周期波动较大；压力、睡眠、旅行、体重、运动、年龄和多种健康因素都可能影响，设备记录本身不能确定原因",

  // ── Interpretation ───────────────────────────────────────────────

  interpretationInsufficient:
    "记录不足，暂时无法给出综合解读。建议持续记录至少 3 个完整周期。",

  interpretationHealthyOverall:
    "现有记录显示周期长度与规律性较稳定；这不等同于临床健康评估",

  interpretationRegularButEdge:
    "周期较规律但长度接近常见参考范围边缘，建议继续记录；若持续变化或伴随症状可在就诊时讨论",

  interpretationSomeVariation:
    "周期存在一定波动，不一定代表异常，但值得结合生活方式综合判断",

  interpretationCycleLengthening: (delta: number) =>
    `近期周期比历史平均延长了约 ${Math.abs(delta)} 天。压力、体重、睡眠、年龄和多种健康因素都可能相关，现有记录不能确定原因`,

  interpretationCycleShortening: (delta: number) =>
    `近期周期比历史平均缩短了约 ${Math.abs(delta)} 天；如果持续变化、备孕或伴随其他症状，可与医生讨论`,

  interpretationCycleStable:
    "近期周期与历史平均保持一致，没有明显的趋势性变化",

  interpretationFrequentIntermenstrual:
    "经间期出血记录较频繁；若反复出现、出血量增加或伴随疼痛，建议咨询妇科医生评估",

  interpretationMinorIntermenstrual:
    "有少量经间期出血记录；仅凭记录时间无法确认原因，建议观察是否重复或伴随其他症状",

  interpretationContraceptive:
    "数据中有避孕方式记录。不同药物或器械对出血模式的影响不同，解读周期时应结合具体方式和使用时间",

  // ── Actionable Advice ────────────────────────────────────────────

  adviceRegularSleep:
    "尽量保持适合自己的规律作息，并把睡眠变化与周期记录放在一起观察；现有数据不能据此判断因果。",

  adviceCycleLengthening:
    "近期周期在变长，可继续记录 2-3 个周期并关注症状；若变化持续、备孕或伴随不适，可咨询医生。",

  adviceCycleShortening:
    "近期周期在缩短，注意观察是否持续及是否伴随出血量或症状变化；如持续可咨询医生。",

  advicePeriodLengthening:
    "经期天数呈延长趋势，留意是否有疲劳、面色苍白或头晕等症状；如有症状或出血增多，请由医生评估是否需要检查。",

  adviceFrequentIntermenstrual:
    "经间期出血频繁出现，建议咨询妇科医生，由医生结合年龄、症状和病史决定评估方式。",

  adviceAbnormalCycleLength:
    "周期长度持续偏离个人基线或常见参考范围时，建议咨询医生，由医生根据症状和病史决定是否需要检查。",

  adviceAllGood:
    "现有记录中的周期长度和规律性较稳定；继续记录变化，并结合个人感受和症状理解。",

  adviceKeepTracking:
    "坚持记录每次经期的起止日期和出血量，持续的数据积累能帮助更早发现潜在变化。",

  // ── Doctor Talking Points ────────────────────────────────────────

  doctorAbnormalCycleLength: (avgCycle: number) =>
    `"我的生理周期平均 ${avgCycle} 天，偏离常见参考范围。结合我的症状和病史，是否需要进一步评估？"`,

  doctorIrregular: (std: number) =>
    `"我的周期波动比较大（标准差 ${std} 天）。结合我的症状和病史，可能需要评估哪些因素？"`,

  doctorCycleLengthening: (delta: number) =>
    `"我注意到近几个月周期在变长（延长了约 ${Math.abs(delta)} 天），这是需要关注的信号吗？"`,

  doctorCycleShortening: (delta: number) =>
    `"我的周期近期缩短了约 ${Math.abs(delta)} 天。结合我的情况，是否需要进一步评估？"`,

  doctorFrequentIntermenstrual:
    `"我经常在两次经期之间有少量出血，这种情况需要做什么检查？"`,

  doctorLongPeriod: (avgDuration: number) =>
    `"我的经期平均持续 ${avgDuration} 天，偏离个人基线。结合出血量、症状和病史，是否需要进一步评估？"`,

  doctorPeriodLengthening:
    `"我最近几次经期比以前长，出血量也可能在增加。结合我的症状，是否需要进一步评估？"`,

};

export type MenstrualCycleT = typeof menstrualCycleZh;
