import type {
  ContraceptiveSample,
  DetectedPeriod,
  IntermenstrualBleedingSample,
  MenstrualCycleAnalysis,
  MenstrualFlowSample,
  MenstrualRegularity,
  TimeWindow,
  WarningMessage,
} from "../types.js";

import type { MenstrualCycleT } from "../i18n/zh/menstrualCycle.js";

import { round } from "./mathUtils.js";
import { isWithinWindow } from "../normalize/buildTimeWindow.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / DAY_MS);
}

function parseFlowLevel(value: string): keyof DetectedPeriod["flowIntensity"] {
  if (/Light/i.test(value)) return "light";
  if (/Medium/i.test(value)) return "medium";
  if (/Heavy/i.test(value)) return "heavy";
  if (/None/i.test(value)) return "none";
  return "unspecified";
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function detectPeriods(flowSamples: MenstrualFlowSample[]): DetectedPeriod[] {
  const sorted = [...flowSamples].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );

  // Filter out "None" flow — those are explicitly "no bleeding" markers
  const withFlow = sorted.filter((s) => !/None/i.test(s.value));
  if (withFlow.length === 0) return [];

  const periods: DetectedPeriod[] = [];
  let currentDays: MenstrualFlowSample[] = [withFlow[0]];

  for (let i = 1; i < withFlow.length; i++) {
    const prev = currentDays[currentDays.length - 1];
    const curr = withFlow[i];
    const gap = daysBetween(prev.startDate, curr.startDate);

    if (gap <= 2) {
      // Same period (allow 1-day gap for skipped logging)
      currentDays.push(curr);
    } else {
      // New period — finalize previous
      periods.push(buildPeriod(currentDays));
      currentDays = [curr];
    }
  }
  periods.push(buildPeriod(currentDays));

  return periods;
}

function buildPeriod(days: MenstrualFlowSample[]): DetectedPeriod {
  const startDate = days[0].startDate;
  const endDate = days[days.length - 1].startDate;
  const durationDays = daysBetween(startDate, endDate) + 1;
  const flowIntensity = { light: 0, medium: 0, heavy: 0, unspecified: 0, none: 0 };

  for (const day of days) {
    const level = parseFlowLevel(day.value);
    flowIntensity[level]++;
  }

  return {
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
    durationDays,
    flowIntensity,
  };
}

export function calculateCycleLengths(periods: DetectedPeriod[]): number[] {
  if (periods.length < 2) return [];

  const lengths: number[] = [];
  for (let i = 1; i < periods.length; i++) {
    const prev = new Date(periods[i - 1].startDate);
    const curr = new Date(periods[i].startDate);
    const days = daysBetween(prev, curr);
    // Filter out implausible values (missed tracking or data gaps)
    if (days >= 15 && days <= 90) {
      lengths.push(days);
    }
  }
  return lengths;
}

function classifyRegularity(std: number | null): MenstrualRegularity | null {
  if (std === null) return null;
  if (std <= 3) return "regular";
  if (std <= 7) return "somewhat_irregular";
  return "irregular";
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function analyzeMenstrualCycle(
  flowSamples: MenstrualFlowSample[],
  intermenstrualSamples: IntermenstrualBleedingSample[],
  contraceptiveSamples: ContraceptiveSample[],
  window: TimeWindow,
  t: MenstrualCycleT,
): { result: MenstrualCycleAnalysis; warnings: WarningMessage[] } {
  const warnings: WarningMessage[] = [];
  flowSamples = flowSamples.filter((sample) => isWithinWindow(sample.startDate, window));
  intermenstrualSamples = intermenstrualSamples.filter((sample) =>
    isWithinWindow(sample.startDate, window),
  );
  contraceptiveSamples = contraceptiveSamples.filter((sample) =>
    isWithinWindow(sample.startDate, window),
  );

  if (flowSamples.length === 0) {
    return {
      result: {
        status: "insufficient_data",
        source: null,
        totalPeriods: 0,
        coverageDays: 0,
        avgCycleLengthDays: null,
        cycleLengthStdDays: null,
        avgPeriodDurationDays: null,
        regularity: null,
        recentCycles: [],
        flowDistribution: { light: 0, medium: 0, heavy: 0, unspecified: 0 },
        intermenstrualBleedingCount: 0,
        intermenstrualBleedingFrequencyPerCycle: null,
        contraceptiveUse: null,
        recent90d: { periods: 0, avgCycleLengthDays: null, intermenstrualBleedingDays: 0 },
        historical: { periods: 0, avgCycleLengthDays: null },
        healthInsights: {
          cycleTrend: null, cycleTrendDelta: null, periodDurationTrend: null,
          flowPattern: "", normalRangeAssessment: "", interpretation: "",
          actionableAdvice: [], doctorTalkingPoints: [],
        },
        notes: [],
      },
      warnings,
    };
  }

  const source = flowSamples[0].sourceName;
  const periods = detectPeriods(flowSamples);
  const cycleLengths = calculateCycleLengths(periods);

  // Coverage
  const uniqueDays = new Set(flowSamples.map((s) => toDateKey(s.startDate)));
  const coverageDays = uniqueDays.size;

  // Averages
  const avgCycleLength = round(average(cycleLengths));
  const cycleLengthStd = round(stdDev(cycleLengths));
  const avgPeriodDuration = round(average(periods.map((p) => p.durationDays)));
  const regularity = classifyRegularity(cycleLengthStd);

  // Flow distribution (excluding "none")
  const totalFlowDays = periods.reduce(
    (sum, p) => sum + p.flowIntensity.light + p.flowIntensity.medium + p.flowIntensity.heavy + p.flowIntensity.unspecified,
    0,
  );
  const flowDistribution = {
    light: totalFlowDays > 0
      ? round(periods.reduce((s, p) => s + p.flowIntensity.light, 0) / totalFlowDays * 100) ?? 0
      : 0,
    medium: totalFlowDays > 0
      ? round(periods.reduce((s, p) => s + p.flowIntensity.medium, 0) / totalFlowDays * 100) ?? 0
      : 0,
    heavy: totalFlowDays > 0
      ? round(periods.reduce((s, p) => s + p.flowIntensity.heavy, 0) / totalFlowDays * 100) ?? 0
      : 0,
    unspecified: totalFlowDays > 0
      ? round(periods.reduce((s, p) => s + p.flowIntensity.unspecified, 0) / totalFlowDays * 100) ?? 0
      : 0,
  };

  // Recent cycles (last 6)
  const recentCycles = periods.slice(-6).map((period, idx, arr) => {
    const allPeriods = periods;
    const globalIdx = allPeriods.indexOf(period);
    let cycleLengthDays: number | null = null;
    if (globalIdx > 0) {
      const prev = new Date(allPeriods[globalIdx - 1].startDate);
      const curr = new Date(period.startDate);
      const days = daysBetween(prev, curr);
      if (days >= 15 && days <= 90) cycleLengthDays = days;
    }
    return {
      periodStart: period.startDate,
      cycleLengthDays,
      periodDurationDays: period.durationDays,
    };
  });

  // Intermenstrual bleeding
  const intermenstrualBleedingCount = intermenstrualSamples.length;
  const intermenstrualBleedingFrequencyPerCycle =
    cycleLengths.length > 0
      ? round(intermenstrualBleedingCount / (cycleLengths.length + 1))
      : null;

  // Contraceptive
  const contraceptiveUse = contraceptiveSamples.length > 0
    ? contraceptiveSamples[contraceptiveSamples.length - 1].value
        .replace(/HKCategoryValueContraceptive/i, "")
        .replace(/([A-Z])/g, " $1")
        .trim()
    : null;

  // Recent 90d vs historical
  const recent90dStart = new Date(window.effectiveEnd.getTime() - 89 * DAY_MS);
  const recent90dPeriods = periods.filter((p) => new Date(p.startDate) >= recent90dStart);
  const recent90dCycleLengths = calculateCycleLengths(recent90dPeriods);
  const recent90dIntermenstrual = intermenstrualSamples.filter(
    (s) => s.startDate >= recent90dStart && s.startDate <= window.effectiveEnd,
  );

  const historicalPeriods = periods.filter((p) => new Date(p.startDate) < recent90dStart);
  const historicalCycleLengths = calculateCycleLengths(historicalPeriods);

  // ── Health Insights: trend detection, pattern interpretation, actionable advice ──

  const recentAvgCycle = round(average(recent90dCycleLengths));
  const historicalAvgCycle = round(average(historicalCycleLengths));
  const cycleTrendDelta =
    recentAvgCycle !== null && historicalAvgCycle !== null && historicalCycleLengths.length >= 3
      ? round(recentAvgCycle - historicalAvgCycle)
      : null;
  const cycleTrend: MenstrualCycleAnalysis["healthInsights"]["cycleTrend"] =
    cycleTrendDelta === null ? null
    : cycleTrendDelta >= 3 ? "lengthening"
    : cycleTrendDelta <= -3 ? "shortening"
    : "stable";

  // Period duration trend (recent 6 vs earlier)
  const recentDurations = periods.slice(-6).map((p) => p.durationDays);
  const earlierDurations = periods.slice(0, -6).map((p) => p.durationDays);
  const recentDurAvg = average(recentDurations);
  const earlierDurAvg = average(earlierDurations);
  const durDelta = recentDurAvg !== null && earlierDurAvg !== null && earlierDurations.length >= 3
    ? recentDurAvg - earlierDurAvg : null;
  const periodDurationTrend: MenstrualCycleAnalysis["healthInsights"]["periodDurationTrend"] =
    durDelta === null ? null : durDelta >= 1 ? "lengthening" : durDelta <= -1 ? "shortening" : "stable";

  // Flow pattern interpretation
  const flowPattern = buildFlowPatternDescription(flowDistribution, periodDurationTrend, t);

  // Normal range assessment
  const normalRangeAssessment = buildNormalRangeAssessment(avgCycleLength, avgPeriodDuration, regularity, t);

  // Comprehensive interpretation
  const interpretation = buildInterpretation(
    avgCycleLength, cycleLengthStd, regularity, cycleTrend, cycleTrendDelta,
    periodDurationTrend, intermenstrualBleedingFrequencyPerCycle, contraceptiveUse, periods.length, t,
  );

  // Actionable advice
  const actionableAdvice = buildActionableAdvice(
    regularity, cycleTrend, periodDurationTrend,
    intermenstrualBleedingFrequencyPerCycle, contraceptiveUse, avgCycleLength, t,
  );

  // Doctor talking points
  const doctorTalkingPoints = buildDoctorTalkingPoints(
    avgCycleLength, cycleLengthStd, regularity, cycleTrend, cycleTrendDelta,
    intermenstrualBleedingFrequencyPerCycle, avgPeriodDuration, periodDurationTrend, t,
  );

  // Notes
  const notes: string[] = [];
  if (periods.length < 3) {
    notes.push(t.noteFewPeriods);
  }
  if (contraceptiveUse) {
    notes.push(t.noteContraceptiveUse(contraceptiveUse));
  }
  if (intermenstrualBleedingCount > 0) {
    notes.push(t.noteIntermenstrualBleeding(intermenstrualBleedingCount));
  }

  // Warnings
  if (regularity === "irregular") {
    warnings.push({
      code: "menstrual_irregular",
      module: "menstrualCycle",
      message: t.warningIrregular(cycleLengthStd!),
    });
  }
  if (avgCycleLength !== null && (avgCycleLength < 21 || avgCycleLength > 38)) {
    warnings.push({
      code: "menstrual_cycle_length",
      module: "menstrualCycle",
      message: t.warningCycleLengthOutOfRange(avgCycleLength),
    });
  }

  return {
    result: {
      status: periods.length >= 2 ? "ok" : "insufficient_data",
      source,
      totalPeriods: periods.length,
      coverageDays,
      avgCycleLengthDays: avgCycleLength,
      cycleLengthStdDays: cycleLengthStd,
      avgPeriodDurationDays: avgPeriodDuration,
      regularity,
      recentCycles,
      flowDistribution,
      intermenstrualBleedingCount,
      intermenstrualBleedingFrequencyPerCycle,
      contraceptiveUse,
      recent90d: {
        periods: recent90dPeriods.length,
        avgCycleLengthDays: recentAvgCycle,
        intermenstrualBleedingDays: recent90dIntermenstrual.length,
      },
      historical: {
        periods: historicalPeriods.length,
        avgCycleLengthDays: historicalAvgCycle,
      },
      healthInsights: {
        cycleTrend,
        cycleTrendDelta,
        periodDurationTrend,
        flowPattern,
        normalRangeAssessment,
        interpretation,
        actionableAdvice,
        doctorTalkingPoints,
      },
      notes,
    },
    warnings,
  };
}

// ── Health Insight Builders ──

function buildFlowPatternDescription(
  dist: MenstrualCycleAnalysis["flowDistribution"],
  durationTrend: MenstrualCycleAnalysis["healthInsights"]["periodDurationTrend"],
  t: MenstrualCycleT,
): string {
  const dominant = dist.heavy >= 40 ? "heavy" : dist.light >= 40 ? "light" : "balanced";
  const parts: string[] = [];

  if (dominant === "heavy") {
    parts.push(t.flowPatternHeavy(dist.heavy));
  } else if (dominant === "light") {
    parts.push(t.flowPatternLight(dist.light));
  } else {
    parts.push(t.flowPatternBalanced(dist.light, dist.medium, dist.heavy));
  }

  if (durationTrend === "lengthening") {
    parts.push(t.flowDurationLengthening);
  } else if (durationTrend === "shortening") {
    parts.push(t.flowDurationShortening);
  }

  return parts.join(t.partSep) + t.partEnd;
}

function buildNormalRangeAssessment(
  avgCycle: number | null,
  avgDuration: number | null,
  regularity: MenstrualRegularity | null,
  t: MenstrualCycleT,
): string {
  if (avgCycle === null) return t.normalRangeInsufficient;

  const parts: string[] = [];

  // Cycle length assessment
  if (avgCycle >= 24 && avgCycle <= 35) {
    parts.push(t.cycleLengthIdeal(avgCycle));
  } else if (avgCycle >= 21 && avgCycle <= 38) {
    const direction = avgCycle < 24 ? t.cycleLengthDirectionShort : t.cycleLengthDirectionLong;
    parts.push(t.cycleLengthNormalButEdge(avgCycle, direction));
  } else {
    parts.push(t.cycleLengthOutOfRange(avgCycle));
  }

  // Duration assessment
  if (avgDuration !== null) {
    if (avgDuration >= 3 && avgDuration <= 7) {
      parts.push(t.periodDurationNormal(avgDuration));
    } else if (avgDuration < 3) {
      parts.push(t.periodDurationShort(avgDuration));
    } else {
      parts.push(t.periodDurationLong(avgDuration));
    }
  }

  // Regularity context
  if (regularity === "regular") {
    parts.push(t.regularityGood);
  } else if (regularity === "somewhat_irregular") {
    parts.push(t.regularitySomewhatIrregular);
  } else if (regularity === "irregular") {
    parts.push(t.regularityIrregular);
  }

  return parts.join(t.partSep) + t.partEnd;
}

function buildInterpretation(
  avgCycle: number | null,
  std: number | null,
  regularity: MenstrualRegularity | null,
  cycleTrend: MenstrualCycleAnalysis["healthInsights"]["cycleTrend"],
  cycleTrendDelta: number | null,
  periodDurationTrend: MenstrualCycleAnalysis["healthInsights"]["periodDurationTrend"],
  intermenstrualFreq: number | null,
  contraceptive: string | null,
  totalPeriods: number,
  t: MenstrualCycleT,
): string {
  if (avgCycle === null || totalPeriods < 3) return t.interpretationInsufficient;

  const parts: string[] = [];

  // Overall health signal
  if (regularity === "regular" && avgCycle >= 24 && avgCycle <= 35) {
    parts.push(t.interpretationHealthyOverall);
  } else if (regularity === "regular") {
    parts.push(t.interpretationRegularButEdge);
  } else {
    parts.push(t.interpretationSomeVariation);
  }

  // Trend interpretation
  if (cycleTrend === "lengthening" && cycleTrendDelta !== null) {
    parts.push(t.interpretationCycleLengthening(cycleTrendDelta));
  } else if (cycleTrend === "shortening" && cycleTrendDelta !== null) {
    parts.push(t.interpretationCycleShortening(cycleTrendDelta));
  } else if (cycleTrend === "stable") {
    parts.push(t.interpretationCycleStable);
  }

  // Intermenstrual bleeding context
  if (intermenstrualFreq !== null && intermenstrualFreq > 0.5) {
    parts.push(t.interpretationFrequentIntermenstrual);
  } else if (intermenstrualFreq !== null && intermenstrualFreq > 0) {
    parts.push(t.interpretationMinorIntermenstrual);
  }

  // Contraceptive context
  if (contraceptive) {
    parts.push(t.interpretationContraceptive);
  }

  return parts.join(t.sentSep) + t.partEnd;
}

function buildActionableAdvice(
  regularity: MenstrualRegularity | null,
  cycleTrend: MenstrualCycleAnalysis["healthInsights"]["cycleTrend"],
  periodDurationTrend: MenstrualCycleAnalysis["healthInsights"]["periodDurationTrend"],
  intermenstrualFreq: number | null,
  contraceptive: string | null,
  avgCycle: number | null,
  t: MenstrualCycleT,
): string[] {
  const advice: string[] = [];

  if (regularity === "irregular" || regularity === "somewhat_irregular") {
    advice.push(t.adviceRegularSleep);
  }

  if (cycleTrend === "lengthening") {
    advice.push(t.adviceCycleLengthening);
  } else if (cycleTrend === "shortening") {
    advice.push(t.adviceCycleShortening);
  }

  if (periodDurationTrend === "lengthening") {
    advice.push(t.advicePeriodLengthening);
  }

  if (intermenstrualFreq !== null && intermenstrualFreq > 0.5) {
    advice.push(t.adviceFrequentIntermenstrual);
  }

  if (avgCycle !== null && (avgCycle < 21 || avgCycle > 38)) {
    advice.push(t.adviceAbnormalCycleLength);
  }

  // Universal good practices
  if (advice.length === 0) {
    advice.push(t.adviceAllGood);
  }
  advice.push(t.adviceKeepTracking);

  return advice;
}

function buildDoctorTalkingPoints(
  avgCycle: number | null,
  std: number | null,
  regularity: MenstrualRegularity | null,
  cycleTrend: MenstrualCycleAnalysis["healthInsights"]["cycleTrend"],
  cycleTrendDelta: number | null,
  intermenstrualFreq: number | null,
  avgDuration: number | null,
  periodDurationTrend: MenstrualCycleAnalysis["healthInsights"]["periodDurationTrend"],
  t: MenstrualCycleT,
): string[] {
  const points: string[] = [];

  if (avgCycle !== null && (avgCycle < 21 || avgCycle > 38)) {
    points.push(t.doctorAbnormalCycleLength(avgCycle));
  }

  if (regularity === "irregular" && std !== null) {
    points.push(t.doctorIrregular(std));
  }

  if (cycleTrend === "lengthening" && cycleTrendDelta !== null) {
    points.push(t.doctorCycleLengthening(cycleTrendDelta));
  } else if (cycleTrend === "shortening" && cycleTrendDelta !== null) {
    points.push(t.doctorCycleShortening(cycleTrendDelta));
  }

  if (intermenstrualFreq !== null && intermenstrualFreq > 0.3) {
    points.push(t.doctorFrequentIntermenstrual);
  }

  if (avgDuration !== null && avgDuration > 7) {
    points.push(t.doctorLongPeriod(avgDuration));
  }

  if (periodDurationTrend === "lengthening") {
    points.push(t.doctorPeriodLengthening);
  }

  return points;
}
