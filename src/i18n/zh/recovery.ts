export const recoveryZh = {
  // ── Separators ──
  partSep: "；",
  partEnd: "。",
  sentSep: "。",

  // ── analyzeRecovery ──
  activeNote: "恢复指标按各自的主数据源汇报，不会跨设备合并。",
  noDataNote: "所选时间窗口内没有可用的恢复指标。",

  // ── buildSpo2Assessment ──
  spo2NoData: "无血氧数据。",
  spo2Normal: (avg: number) =>
    `近期设备记录的平均血氧为 ${avg}%。消费级设备读数不能用于确认肺部功能或排除疾病，趋势比单次读数更值得关注。`,
  spo2Low: (avg: number) =>
    `近期设备记录的平均血氧为 ${avg}%，低于常见参考区间。先检查佩戴、环境和测量条件；若多次出现或伴随气促、胸痛等不适，请咨询医生。`,
  spo2Critical: (avg: number) =>
    `近期设备记录的平均血氧为 ${avg}%，多次偏低值得尽快复核。设备不能用于诊断；若复测仍低或同时不适，请及时联系医疗专业人员。`,

  // ── buildNormalRangeAssessment ──
  rhrObserved: (avg: number, delta: number | null) =>
    `近 30 天静息心率均值 ${avg} bpm${delta === null ? "，基线样本不足" : `，较个人基线变化 ${delta > 0 ? "+" : ""}${delta} bpm`}；优先结合个人趋势、症状和测量条件解读`,

  hrvNote: (avg: number) =>
    `HRV 均值 ${avg} ms——HRV 个体差异大，绝对值的参考意义有限，更重要的是观察趋势变化`,

  spo2InRangeNormal: (avg: number) =>
    `设备记录血氧 ${avg}%，处于常见参考区间；消费级设备不能用于诊断`,
  spo2InRangeLow: (avg: number) =>
    `设备记录血氧 ${avg}%，低于常见参考值（≥95%）；先复核测量条件，持续出现或伴随不适时咨询医生`,

  rrObserved: (avg: number, delta: number | null) =>
    `设备记录呼吸频率均值 ${avg} 次/分${delta === null ? "，基线样本不足" : `，较个人基线变化 ${delta > 0 ? "+" : ""}${delta} 次/分`}；导出数据未说明测量场景，不按统一静息区间分级`,

  vo2Good: (avg: number) =>
    `VO2 Max ${avg} mL/kg/min；需结合年龄、性别、设备和个人趋势解释`,
  vo2Moderate: (avg: number) =>
    `VO2 Max ${avg} mL/kg/min；本报告缺少可靠的年龄与性别分层，不作高低分级，建议观察个人趋势`,
  vo2Low: (avg: number) =>
    `VO2 Max ${avg} mL/kg/min；需结合年龄、性别、设备和个人趋势解释`,

  normalRangeInsufficientData: "恢复指标数据不足，无法评估。",

  // ── buildInterpretation ──
  interpretationInsufficientData: "记录不足，暂时无法给出综合解读。",

  coherencePositive: "静息心率下降且 HRV 上升，与近期恢复信号改善方向一致；仍应结合主观感受和个人长期基线",
  coherenceNegative: "静息心率上升且 HRV 下降，与近期压力或恢复不足方向一致，但仅凭设备数据不能确定原因",
  coherencePartialDecline: "恢复指标出现部分退化信号，建议结合近期的睡眠质量和训练强度综合判断",
  coherenceStable: "恢复指标保持稳定，没有明显的趋势性变化",
  coherenceAccumulating: "恢复指标可用，基线数据正在积累中，后续趋势判断会更可靠",

  spo2LowContext: (avg: number) =>
    `设备记录的平均血氧为 ${avg}%，建议先复核佩戴与测量条件；若多次偏低或伴随症状，再咨询医生`,

  // ── buildActionableAdvice ──
  adviceBothWorsening: "恢复指标同步走弱，可结合疲劳、疼痛和训练计划考虑暂时降低强度或增加恢复，并观察后续趋势。",
  adviceRhrWorsening: "静息心率呈上升趋势，关注近期是否有压力增加、睡眠变差或过度训练，确保充分的恢复时间。",
  adviceHrvWorsening: "HRV 呈下降趋势，建议先检查睡眠、训练量、饮酒、压力和测量条件，并结合后续趋势判断。",
  adviceSpo2Low: "设备血氧读数偏低时先确认佩戴和环境条件；若多次出现或伴随气促、胸痛等症状，请咨询医生。",
  adviceVo2Low: "VO2 Max 应按年龄、性别和个人趋势解释；不要仅凭一个固定阈值调整训练。",
  adviceGood: "现有恢复指标相对稳定；是否维持当前运动安排，还应结合主观疲劳、疼痛和训练目标。",
  adviceConsistentMeasurement: "保持测量时间的一致性（如每天早起后测量），这能让趋势对比更可靠。",

  // ── buildDoctorTalkingPoints ──
  doctorRhrHigh: (avg: number) =>
    `"我的设备最近记录静息心率平均 ${avg} bpm；如果该读数持续或伴随不适，结合我的症状和病史是否需要进一步评估？"`,
  doctorRhrRising: (delta: number) =>
    `"我的静息心率近期上升了 ${delta} bpm，这种变化是否需要关注？"`,
  doctorSpo2Low: (avg: number) =>
    `"我的设备多次记录平均血氧约 ${avg}%。如何确认读数，结合我的症状是否需要进一步评估？"`,
  doctorHrvDrop: (delta: number) =>
    `"我的设备记录 HRV 近期下降了 ${delta} ms。结合我的其他指标和症状，这个变化是否需要关注？"`,
};
export type RecoveryT = typeof recoveryZh;
