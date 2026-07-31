import type { CrossMetricT } from "../zh/crossMetric.js";

export const crossMetricEn: CrossMetricT = {
  // ── Separators ──
  partSep: "; ",
  partEnd: ".",
  sentSep: ". ",

  // ── Sleep-Recovery Link ──────────────────────────────────────────

  sleepRecoveryNoShortNights:
    "No nights with less than 6 hours of sleep recently; sleep duration is well maintained.",

  sleepRecoveryHrvDrop: (
    shortDays: number,
    hrvDrop: number,
    shortHRV: number,
    normalHRV: number,
  ) =>
    `Across ${shortDays} ${shortDays === 1 ? "night" : "nights"} with less than 6 hours of sleep, next-day mean HRV was ${Math.abs(hrvDrop)}% lower than after normal sleep (${shortHRV} vs ${normalHRV} ms). This is an association in the available sample, not evidence of causation.`,

  sleepRecoveryNoHrvData: (
    shortDays: number,
    shortPairedDays: number,
    normalPairedDays: number,
  ) =>
    `${shortDays} ${shortDays === 1 ? "night" : "nights"} had less than 6 hours of sleep, but only ${shortPairedDays}/${normalPairedDays} next-day HRV pairs were available after short/normal sleep. That is not enough to assess a stable association.`,

  sleepRecoveryTolerable: (shortDays: number) =>
    `${shortDays} ${shortDays === 1 ? "night" : "nights"} had less than 6 hours of sleep; the paired sample did not show a consistent next-day HRV decline above 5%. This does not mean short sleep had no effect.`,

  // ── Sleep Consistency ────────────────────────────────────────────

  sleepConsistencyInsufficient: "Insufficient data to assess sleep schedule regularity.",

  sleepConsistencyHigh: (bedStd: number, wakeStd: number) =>
    `Bedtime standard deviation is approximately ${bedStd} minutes and wake-time standard deviation is approximately ${wakeStd} minutes; the recorded schedule is relatively consistent.`,

  sleepConsistencyModerate: (bedStd: number, wakeStd: number) =>
    `Bedtime standard deviation is approximately ${bedStd} minutes, and wake time standard deviation is approximately ${wakeStd} minutes — your schedule shows moderate variability. Prioritizing a fixed wake time is recommended; bedtime will naturally stabilize.`,

  sleepConsistencyLow: (bedStd: number, wakeStd: number) =>
    `Bedtime standard deviation is approximately ${bedStd} minutes and wake-time standard deviation is approximately ${wakeStd} minutes; the recorded schedule is highly variable. Interpret this with total sleep and daytime function before deciding whether to adjust it.`,

  // ── Activity-Recovery Balance ────────────────────────────────────

  activityRecoveryNoHighStrain:
    "No high-activity days (\u226560 minutes) recently; unable to assess training-recovery balance.",

  activityRecoveryInsufficientHrv: (highStrainDays: number) =>
    `${highStrainDays} ${highStrainDays === 1 ? "day" : "days"} had high activity levels, but there is insufficient HRV data to assess recovery adequacy.`,

  activityRecoveryAdequate: (
    highStrainDays: number,
    highHRV: number,
    restHRV: number,
  ) =>
    `${highStrainDays} ${highStrainDays === 1 ? "day" : "days"} had high activity levels. In the paired sample, next-day mean HRV was ${highHRV} ms versus ${restHRV} ms after low-activity days, with no consistent association with poorer recovery observed.`,

  activityRecoveryInadequate: (
    highStrainDays: number,
    highHRV: number,
    restHRV: number,
  ) =>
    `${highStrainDays} ${highStrainDays === 1 ? "day" : "days"} had high activity levels. In the paired sample, next-day mean HRV was ${highHRV} ms versus ${restHRV} ms after low-activity days. The two may be associated, but this does not establish causation; use subjective fatigue and subsequent trends when considering a training adjustment.`,

  // ── Recovery Coherence ───────────────────────────────────────────

  recoveryCoherenceInsufficient: "Insufficient recovery data to assess trend coherence.",

  recoveryCoherenceAligned: (
    rhrTrend: string,
    hrvTrend: string,
  ) =>
    `Resting heart rate is ${rhrTrend === "improving" ? "declining" : "stable"} and HRV is ${hrvTrend === "improving" ? "rising" : "stable"}; the two personal recovery indicators are directionally aligned, not a clinical assessment of autonomic balance.`,

  recoveryCoherenceBothWorsening:
    "Resting heart rate is rising while HRV is declining, directionally consistent with weaker recent recovery support. Review stress, sleep, training load, and measurement conditions, but do not infer a cause from these records alone.",

  recoveryCoherenceMixed: (rhrTrend: string, hrvTrend: string) =>
    `Resting heart rate trend is "${rhrTrend}" and HRV trend is "${hrvTrend}" — the two indicators are not fully aligned. Consider whether mixed stressors may be at play (e.g., increased training but improved sleep).`,

  // Recovery trend labels
  trendImproving: "improving",
  trendWorsening: "worsening",
  trendStable: "stable",

  // ── Composite Assessment ─────────────────────────────────────────

  readinessGood: "Good",
  readinessModerate: "Moderate",
  readinessLow: "Low",
  readinessInsufficientData: "Insufficient data",

  compositeSleep: (score: number) => `Sleep ${score}/100`,
  compositeRecovery: (score: number) => `Recovery ${score}/100`,
  compositeActivity: (score: number) => `Activity ${score}/100`,

  compositeSummary: (
    scoresPart: string,
    readinessLabel: string,
  ) =>
    `Composite scores: ${scoresPart}. Overall readiness: ${readinessLabel}.`,

  compositeScoreSeparator: ", ",

  compositeLowAdvice: "Prioritize improving sleep and recovery before increasing training intensity.",
  compositeModerateAdvice: "There is room for improvement; focus on the dimension with the lowest score.",
  compositeGoodAdvice: "Recorded dimensions are relatively stable; maintain the current rhythm and continue checking it against how you feel.",

  compositeInsufficientDimensions:
    "This report does not generate an unvalidated composite health score; use the personal trends, sample coverage, and data gaps for each metric.",

  // ── Pattern Detection ────────────────────────────────────────────

  patternWeekendWarrior: (
    weekendAvg: number,
    weekdayAvg: number,
    ratio: number,
  ) =>
    `Weekend-concentrated activity pattern: Weekend average exercise is ${weekendAvg} minutes — ${ratio}x the weekday average of ${weekdayAvg} minutes. This describes timing, not lower exercise benefit; if individual weekend sessions feel excessive, light weekday activity can distribute the load.`,

  patternNightOwlDrift: (driftMin: number) =>
    `Later bedtime pattern: Bedtime shifted later by approximately ${driftMin} minutes over the analysis period. This describes clock-time change; if an earlier schedule is desired, try a stable wake time and morning daylight.`,

  patternSleepDebtCompensation: (weekdayAvg: string, weekendAvg: string) =>
    `Weekday/weekend sleep difference: Weekday average is ${weekdayAvg} hours and weekend average is ${weekendAvg} hours. The difference may reflect schedule constraints or catch-up sleep; first check whether weekday sleep is adequate and sustainable.`,

  patternRecoveryDeficit: (maxConsecutive: number) =>
    `${maxConsecutive} consecutive days had high activity (\u226545 minutes) with no low-activity day. Duration alone cannot establish inadequate recovery; consider a light day if subjective fatigue, sleep, or recovery metrics also worsen.`,

  // ── Notable Days ─────────────────────────────────────────────────

  notableSleepDuration: "Sleep Duration",
  notableHRV: "HRV",
  notableRHR: "Resting Heart Rate",
  notableExercise: "Exercise Duration",

  notableUnitHours: "hours",
  notableUnitMs: "ms",
  notableUnitBpm: "bpm",
  notableUnitMinutes: "minutes",

  notableDayContext: (avg: number, unit: string) => `mean ${avg} ${unit}`,
};
