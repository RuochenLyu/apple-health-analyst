import type { MenstrualCycleT } from "../zh/menstrualCycle.js";

export const menstrualCycleEn: MenstrualCycleT = {
  // ── Separators ──
  partSep: "; ",
  partEnd: ".",
  sentSep: ". ",

  // ── Notes ────────────────────────────────────────────────────────

  noteFewPeriods: "Limited menstrual cycle records; regularity assessment has reduced confidence.",

  noteContraceptiveUse: (contraceptiveUse: string) =>
    `A contraceptive method is recorded (${contraceptiveUse}); different methods affect bleeding patterns differently.`,

  noteIntermenstrualBleeding: (count: number) =>
    `${count} intermenstrual bleeding event(s) detected.`,

  // ── Warnings ─────────────────────────────────────────────────────

  warningIrregular: (cycleLengthStd: number) =>
    `Menstrual cycle is irregular, with a cycle length standard deviation of ${cycleLengthStd} days.`,

  warningCycleLengthOutOfRange: (avgCycleLength: number) =>
    `Average cycle length is ${avgCycleLength} days, outside the common reference range used by this report (21\u201338 days).`,

  // ── Flow Pattern Description ─────────────────────────────────────

  flowPatternHeavy: (heavyPct: number) =>
    `Heavy flow accounts for ${heavyPct}% of recorded entries. Qualitative Health data cannot identify a cause; seek medical advice if this differs from your usual pattern or occurs with symptoms`,

  flowPatternLight: (lightPct: number) =>
    `Light flow accounts for ${lightPct}% of recorded entries. This qualitative category is sensitive to logging habits and does not establish hormone or endometrial status`,

  flowPatternBalanced: (lightPct: number, mediumPct: number, heavyPct: number) =>
    `Recorded flow distribution is light ${lightPct}%, medium ${mediumPct}%, and heavy ${heavyPct}%. These categories support trend tracking but do not establish clinical normality`,

  flowDurationLengthening:
    "Recent period duration shows a lengthening trend; if accompanied by increased bleeding, watch for signs of anemia (fatigue, dizziness)",

  flowDurationShortening:
    "Recent period duration shows a shortening trend. Stress, weight, and many health factors may be related, but these records cannot identify a cause",

  // ── Normal Range Assessment ──────────────────────────────────────

  normalRangeInsufficient: "Insufficient data for assessment.",

  cycleLengthIdeal: (avgCycle: number) =>
    `Average cycle length is ${avgCycle} days, within the common reference range used by this report (24\u201335 days)`,

  cycleLengthNormalButEdge: (avgCycle: number, direction: string) =>
    `Average cycle length is ${avgCycle} days, within a common reference range (21\u201338 days) but toward the ${direction} edge; relevance depends on your baseline and symptoms`,

  cycleLengthDirectionShort: "short",
  cycleLengthDirectionLong: "long",

  cycleLengthOutOfRange: (avgCycle: number) =>
    `Average cycle length is ${avgCycle} days, outside a common reference range (21\u201338 days); seek gynecological advice if it persists outside your baseline or occurs with symptoms`,

  periodDurationNormal: (avgDuration: number) =>
    `Average recorded period duration is ${avgDuration} days, within the common reference range used by this report`,

  periodDurationShort: (avgDuration: number) =>
    `Average recorded period duration is ${avgDuration} days, which is short; first interpret it against your personal baseline and logging completeness`,

  periodDurationLong: (avgDuration: number) =>
    `Average recorded period duration is ${avgDuration} days, above a common reference range (3\u20137 days); seek advice if flow also increases or symptoms such as fatigue or dizziness occur`,

  regularityGood:
    "Recorded cycles are relatively regular; this describes the logging pattern and cannot independently assess endocrine function",

  regularitySomewhatIrregular:
    "Cycle shows some variability. Stress, sleep changes, and cross-timezone travel may accompany short-term changes, but the records cannot identify a cause",

  regularityIrregular:
    "Cycle variability is substantial. Stress, sleep, travel, weight, exercise, age, and many health factors can contribute; device records cannot identify the cause",

  // ── Interpretation ───────────────────────────────────────────────

  interpretationInsufficient:
    "Insufficient records for a comprehensive interpretation. Continue tracking for at least 3 complete cycles.",

  interpretationHealthyOverall:
    "The available records show relatively stable cycle length and regularity; this is not a clinical health assessment",

  interpretationRegularButEdge:
    "Your cycle is regular but near the edge of a common reference range. Keep tracking it and discuss it with a clinician if the pattern persists or symptoms occur",

  interpretationSomeVariation:
    "Your cycle shows some variability, which does not necessarily indicate an abnormality, but is worth evaluating in the context of your lifestyle",

  interpretationCycleLengthening: (delta: number) =>
    `Recent cycles have lengthened by approximately ${Math.abs(delta)} days compared with your historical average. Stress, weight, sleep, age, and many health factors may be related; these records cannot identify a cause`,

  interpretationCycleShortening: (delta: number) =>
    `Recent cycles have shortened by approximately ${Math.abs(delta)} days compared with your historical average. If this continues, you are trying to conceive, or other symptoms occur, discuss it with a clinician`,

  interpretationCycleStable:
    "Recent cycles are consistent with your historical average, with no significant trend changes",

  interpretationFrequentIntermenstrual:
    "Intermenstrual bleeding is recorded frequently. Seek gynecological advice if it recurs, becomes heavier, or occurs with pain",

  interpretationMinorIntermenstrual:
    "Some intermenstrual bleeding has been recorded. Timing alone cannot establish the cause; watch whether it repeats or occurs with other symptoms",

  interpretationContraceptive:
    "A contraceptive method is recorded. Different medicines and devices affect bleeding patterns differently, so interpretation should account for the exact method and dates of use",

  // ── Actionable Advice ────────────────────────────────────────────

  adviceRegularSleep:
    "Aim for a sleep schedule that is regular and workable for you, and observe sleep and cycle changes together; these data cannot establish causation.",

  adviceCycleLengthening:
    "Your cycles have been getting longer recently. Continue tracking for 2\u20133 cycles and note symptoms; seek advice if the change persists, you are trying to conceive, or symptoms occur.",

  adviceCycleShortening:
    "Your cycles have been getting shorter recently. Watch whether the change persists or occurs with changes in flow or symptoms; consult a clinician if it continues.",

  advicePeriodLengthening:
    "Period duration is trending longer. Watch for fatigue, pallor, or dizziness; if symptoms or heavier bleeding occur, ask a clinician whether evaluation is needed.",

  adviceFrequentIntermenstrual:
    "Intermenstrual bleeding is occurring frequently. Seek gynecological advice so a clinician can choose an appropriate evaluation based on age, symptoms, and history.",

  adviceAbnormalCycleLength:
    "If cycle length remains outside your personal baseline or a common reference range, consult a clinician, who can decide whether any tests are appropriate based on symptoms and history.",

  adviceAllGood:
    "Recorded cycle length and regularity are relatively stable. Keep tracking changes and interpret them alongside symptoms and how you feel.",

  adviceKeepTracking:
    "Keep recording the start/end dates and flow of each period \u2014 consistent data helps detect potential changes earlier.",

  // ── Doctor Talking Points ────────────────────────────────────────

  doctorAbnormalCycleLength: (avgCycle: number) =>
    `"My menstrual cycle averages ${avgCycle} days, outside a common reference range. Given my symptoms and history, does this need further evaluation?"`,

  doctorIrregular: (std: number) =>
    `"My cycle varies quite a bit (standard deviation of ${std} days). Given my symptoms and history, which factors may need evaluation?"`,

  doctorCycleLengthening: (delta: number) =>
    `"I've noticed my cycles have been getting longer recently (by about ${Math.abs(delta)} days) \u2014 is this something I should be concerned about?"`,

  doctorCycleShortening: (delta: number) =>
    `"My cycles have shortened recently by about ${Math.abs(delta)} days. Given my situation, does this need further evaluation?"`,

  doctorFrequentIntermenstrual:
    `"I often have spotting between periods \u2014 what tests should I have done?"`,

  doctorLongPeriod: (avgDuration: number) =>
    `"My period lasts an average of ${avgDuration} days and differs from my baseline. Given the flow, symptoms, and history, does it need further evaluation?"`,

  doctorPeriodLengthening:
    `"My recent periods have been longer than usual and flow may be increasing. Given my symptoms, does this need further evaluation?"`,

};
