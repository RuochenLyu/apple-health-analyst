import type { ActivityT } from "../zh/activity.js";

export const activityEn: ActivityT = {
  workoutLabelLocale: "en",
  // ── Separators ──
  partSep: "; ",
  partEnd: ".",
  sentSep: ". ",

  source: "Activity Summaries + Workout Records",
  activeNote: "Daily activity trends come from activity summaries; workout types are counted separately.",
  noDataNote: "No activity summaries or workout records available in the selected time window.",

  whoNoData: "No Apple Exercise Time records are available for weekly activity context.",
  exerciseGuidelineContext: (weeklyMinutes) =>
    `Apple Exercise Time extrapolates to about ${weeklyMinutes} min/week. This field does not fully establish intensity or unrecorded activity, so it cannot determine a gap to WHO guidance or generate an exercise prescription.`,

  varietyNone: "No workout types recorded recently.",
  varietySingle: (type) =>
    `Workout variety is limited (only ${type}). Consider mixing exercise types — e.g., cardio + strength + flexibility — for more comprehensive health benefits.`,
  varietyBalanced: (types) =>
    `Recent records contain multiple activity types (${types}). Variety describes the mix; it does not by itself establish balanced training or lower injury risk.`,
  varietyRich: (types, count) =>
    `Recent records contain ${count} activity types (${types}, among others). Interpret the mix using each type's frequency, intensity, and the person's goals.`,

  exerciseRecorded: (dailyMin, weeklyMin) =>
    `Apple Exercise Time averages ${dailyMin} min/day (about ${weeklyMin} min/week extrapolated); it supports personal trend review but is not the same as intensity-classified activity minutes`,

  standMeetsGoal: (hours) =>
    `About ${hours} hours/day meet Apple's “Stand Hour” recording condition`,
  standReasonable: (hours) =>
    `About ${hours} hours/day meet Apple's “Stand Hour” condition; this is not total time spent standing`,
  standLow: (hours) =>
    `About ${hours} hours/day meet Apple's “Stand Hour” condition. The count is low but cannot quantify total sedentary time`,

  activeEnergyBurned: (kcal) =>
    `Daily active energy ${kcal} kcal`,

  normalRangeInsufficientData: "Insufficient activity data for assessment.",

  interpretationInsufficientData: "Insufficient records for a comprehensive interpretation.",

  exerciseInterpretation: "Apple Exercise Time can support personal activity trends but cannot determine compliance with public-health guidance on its own",

  trendImproving: (delta) =>
    `Recent recorded daily exercise increased by ~${delta} minutes compared with baseline`,
  trendDeclining: (delta) =>
    `Recent daily exercise decreased by ~${delta} minutes compared to baseline. If unintentional, consider whether time or motivation barriers have emerged`,
  trendStable: "Exercise volume remains stable — consistency is key to long-term benefits",

  sedentaryWarning: "Few hours meet Apple's “Stand Hour” condition. This can prompt attention to movement breaks but does not directly measure sedentary time",

  adviceStandMore: "Consider movement reminders during long seated or desk periods. Apple's “Stand Hour” only records whether some qualifying movement occurred in that hour.",
  adviceDeclining: "Exercise volume is trending down. Consider finding a workout partner or setting a specific exercise schedule — external accountability is more reliable than willpower.",
  adviceCrossTrain: "If it fits your goals, try one different activity type per week, starting at low intensity and monitoring how you respond.",
  adviceGood: "Recorded exercise rhythm is relatively stable; whether to maintain or change the mix should depend on goals, fatigue, and pain.",
  adviceTrack: "Continue recording workouts with the device or app you already use to follow personal trends; include activity type, intensity, fatigue, and pain when interpreting them.",
};
