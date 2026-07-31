import type { SleepT } from "../zh/sleep.js";

export const sleepEn: SleepT = {
  // ── Separators ──
  partSep: "; ",
  partEnd: ".",
  sentSep: ". ",

  // ── analyzeSleep ──
  noSleepRecords: "No sleep records available in the selected time window.",
  stagedNote: "Sleep stage percentages are calculated based on the selected primary sleep data source only.",
  unstagedNote: "The selected sleep data source does not provide staged sleep data.",
  partialNightWarning: (nightKey, hours) =>
    `Excluded ${nightKey} from sleep trends as it contains only ${hours} hours of sleep.`,

  // ── buildDeepSleepAssessment ──
  deepSleepNoData: "The current data source does not provide sleep stage data; deep sleep assessment is unavailable.",
  deepSleepObserved: (deep) =>
    `Device-estimated deep sleep is ${deep}%. This is an algorithmic classification best used for personal long-term trends, not to determine recovery quality or a sleep disorder.`,

  // ── buildRemSleepAssessment ──
  remSleepNoData: "The current data source does not provide sleep stage data; REM sleep assessment is unavailable.",
  remSleepObserved: (rem) =>
    `Device-estimated REM sleep is ${rem}%. This is an algorithmic classification; use your own long-term trend rather than inferring a cause from one proportion.`,

  // ── buildNormalRangeAssessment ──
  normalRangeInsufficientData: "Insufficient data for assessment.",

  avgSleepObserved: (avg) =>
    `Recorded sleep averaged ${avg} hours over the last 30 days; whether that is sufficient depends on personal needs, daytime function, and the longer-term baseline`,
  sleepStagesObserved: (deep, rem) =>
    `device-estimated deep sleep ${deep ?? "—"}% and REM ${rem ?? "—"}%; stage proportions are only used for personal trend observation`,
  bedtimeObserved: (bedtime) =>
    `median bedtime ${bedtime}; whether it fits depends on wake time, total sleep, regularity, and your schedule`,

  // ── buildInterpretation ──
  interpretationInsufficientData: "Not enough records for a comprehensive interpretation. We recommend tracking at least 7 nights.",

  durationContext: (avg) =>
    `Recorded sleep averaged ${avg} hours over the last 30 days; this report does not use one fixed range to decide whether it is right for an individual`,

  // Trend
  trendImproving: (delta) =>
    `Recent recorded sleep duration increased by approximately ${delta} hours compared with baseline; whether this is an improvement also depends on regularity and daytime function`,
  trendDeclining: (delta) =>
    `Recent recorded sleep duration decreased by approximately ${delta} hours compared with baseline; if daytime sleepiness or reduced concentration also occurs, the changes may be related but the records cannot establish the cause`,
  trendStable: "Recent sleep duration remains stable compared to baseline, with no significant fluctuation",

  // ── buildActionableAdvice ──
  adviceSleepMore: "Try moving your bedtime 15-30 minutes earlier, gradually increasing total sleep duration - drastic schedule changes are harder to sustain.",
  adviceDeclining: "Sleep has been trending downward recently. Consider reviewing contributing factors: work stress, screen time, caffeine intake, or changes in exercise timing.",
  adviceBedtimeLate: "For a late bedtime, first anchor a wake time that fits your life, then shift bedtime gradually enough to protect total sleep.",
  adviceGood: "Current sleep records are relatively stable. Continue a schedule that works for you and a comfortable sleep environment.",
  adviceConsistentWake: "Aim for a reasonably consistent wake time that fits your life, including weekends; make changes gradually when needed.",

  // ── buildDoctorTalkingPoints ──
  doctorLowSleep: (avg) =>
    `"My average sleep is only ${avg} hours. Should I get a sleep quality evaluation if this persists?"`,
  doctorDeclining: (delta) =>
    `"My sleep duration has dropped by about ${delta} hours recently. Is this change something to be concerned about?"`,
};
