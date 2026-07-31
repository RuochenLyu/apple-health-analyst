import type { RecoveryT } from "../zh/recovery.js";

export const recoveryEn: RecoveryT = {
  // ── Separators ──
  partSep: "; ",
  partEnd: ".",
  sentSep: ". ",

  // ── analyzeRecovery ──
  activeNote: "Recovery metrics are reported per their primary data source and are not merged across devices.",
  noDataNote: "No recovery metrics available in the selected time window.",

  // ── buildSpo2Assessment ──
  spo2NoData: "No blood oxygen data available.",
  spo2Normal: (avg) =>
    `Recent device-recorded average SpO2 is ${avg}%. A consumer-device reading cannot confirm lung function or rule out disease; the repeated trend is more useful than one reading.`,
  spo2Low: (avg) =>
    `Recent device-recorded average SpO2 is ${avg}%, below a common reference range. First check fit, environment, and measurement conditions; seek medical advice if readings repeat or symptoms occur.`,
  spo2Critical: (avg) =>
    `Recent device-recorded average SpO2 is ${avg}%, and repeated low readings merit prompt confirmation. The device is not diagnostic; contact a clinician if repeat readings remain low or symptoms are present.`,

  // ── buildNormalRangeAssessment ──
  rhrObserved: (avg, delta) =>
    `Resting heart rate averaged ${avg} bpm over the last 30 days${delta === null ? ", with insufficient baseline samples" : `, ${delta > 0 ? "+" : ""}${delta} bpm versus the personal baseline`}; interpret it primarily through personal trends, symptoms, and measurement conditions`,

  hrvNote: (avg) =>
    `HRV average ${avg} ms - HRV varies greatly between individuals, so absolute values have limited reference value; trend changes are more important to monitor`,

  spo2InRangeNormal: (avg) =>
    `Device-recorded SpO2 ${avg}%, within a common reference range; a consumer device is not diagnostic`,
  spo2InRangeLow: (avg) =>
    `Device-recorded SpO2 ${avg}%, below a common reference value (>=95%); confirm measurement conditions and seek advice if it repeats or symptoms occur`,

  rrObserved: (avg, delta) =>
    `Device-recorded respiratory rate averaged ${avg} breaths/min${delta === null ? ", with insufficient baseline samples" : `, ${delta > 0 ? "+" : ""}${delta} breaths/min versus the personal baseline`}; the export does not establish measurement context, so this report does not assign a universal resting category`,

  vo2Good: (avg) =>
    `VO2 Max ${avg} mL/kg/min; interpret with age, sex, device context, and personal trend`,
  vo2Moderate: (avg) =>
    `VO2 Max ${avg} mL/kg/min; this report lacks reliable age- and sex-specific context, so it does not assign a high/low category`,
  vo2Low: (avg) =>
    `VO2 Max ${avg} mL/kg/min; interpret with age, sex, device context, and personal trend`,

  normalRangeInsufficientData: "Insufficient recovery metric data for assessment.",

  // ── buildInterpretation ──
  interpretationInsufficientData: "Not enough records to provide a comprehensive interpretation.",

  coherencePositive: "Resting heart rate is lower while HRV is higher, which is directionally consistent with improved recent recovery signals; interpret alongside how you feel and your personal baseline",
  coherenceNegative: "Resting heart rate is higher while HRV is lower, which is directionally consistent with greater recent strain or reduced recovery, but device data alone cannot identify the cause",
  coherencePartialDecline: "Recovery metrics show partial deterioration signals. Consider evaluating in conjunction with recent sleep quality and training intensity",
  coherenceStable: "Recovery metrics remain stable with no significant trending changes",
  coherenceAccumulating: "Recovery metrics are available; baseline data is still accumulating and trend assessments will become more reliable over time",

  spo2LowContext: (avg) =>
    `Device-recorded average SpO2 is ${avg}%. Check fit and measurement conditions first; seek medical advice if low readings repeat or symptoms occur`,

  // ── buildActionableAdvice ──
  adviceBothWorsening: "Recovery metrics are simultaneously weakening. Use fatigue, pain, and the training plan to decide whether to reduce intensity temporarily or add recovery, then watch the subsequent trend.",
  adviceRhrWorsening: "Resting heart rate is trending upward. Check whether stress has increased, sleep has worsened, or training has been excessive recently, and ensure adequate recovery time.",
  adviceHrvWorsening: "HRV is trending downward. First review sleep, training load, alcohol, stress, and measurement conditions, then use subsequent trends to interpret it.",
  adviceSpo2Low: "For low device SpO2 readings, first confirm fit and environmental conditions; consult a clinician if they repeat or occur with shortness of breath, chest pain, or other symptoms.",
  adviceVo2Low: "Interpret VO2 Max by age, sex, device context, and personal trend rather than using one fixed threshold to change training.",
  adviceGood: "Current recovery metrics are relatively stable. Whether to maintain the current exercise plan should also depend on fatigue, pain, and training goals.",
  adviceConsistentMeasurement: "Measure at the same time each day (e.g., right after waking) to make trend comparisons more reliable.",

  // ── buildDoctorTalkingPoints ──
  doctorRhrHigh: (avg) =>
    `"My device recently recorded an average resting heart rate of ${avg} bpm. If that persists or occurs with symptoms, do my history and symptoms warrant further evaluation?"`,
  doctorRhrRising: (delta) =>
    `"My resting heart rate has risen by ${delta} bpm recently. Is this change something to be concerned about?"`,
  doctorSpo2Low: (avg) =>
    `"My device has repeatedly recorded average SpO2 around ${avg}%. How should I confirm the readings, and do my symptoms warrant further evaluation?"`,
  doctorHrvDrop: (delta) =>
    `"My device-recorded HRV has dropped by ${delta} ms recently. Given my other metrics and symptoms, is this change relevant?"`,
};
