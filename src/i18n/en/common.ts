import type { CommonT } from "../zh/common.js";

export const commonEn: CommonT = {
  insufficientData: "Insufficient data",
  insufficientDataFull: "Insufficient data for assessment.",
  insufficientInterpretation: "Not enough records to provide a comprehensive interpretation.",
  partSeparator: "; ",
  partEnding: ".",
  sentenceSeparator: " ",
  hours: "hours",
  minutes: "minutes",
  days: "days",
  times: "times",
  sleep: "Sleep",
  recovery: "Recovery",
  activity: "Activity",
  bodyComposition: "Body Composition",
  menstrualCycle: "Menstrual Cycle",
  timestampDataQualityWarning: (count) =>
    `${count} sample(s) with invalid or clearly implausible timestamps were isolated. The audit count remains in coverage and the samples were not analyzed.`,
  unsupportedUnitWarning: (count) =>
    `${count} value(s) with units that could not be normalized safely were ignored. The audit count remains in coverage to prevent mislabeled results.`,
  duplicateWorkoutWarning: (count) =>
    `${count} near-identical cross-source workout record(s) were merged before analysis. Coverage retains the raw workout count.`,
};
