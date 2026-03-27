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

import { roundNumber } from "./sleepShared.js";

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
): { result: MenstrualCycleAnalysis; warnings: WarningMessage[] } {
  const warnings: WarningMessage[] = [];

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
  const avgCycleLength = roundNumber(average(cycleLengths));
  const cycleLengthStd = roundNumber(stdDev(cycleLengths));
  const avgPeriodDuration = roundNumber(average(periods.map((p) => p.durationDays)));
  const regularity = classifyRegularity(cycleLengthStd);

  // Flow distribution (excluding "none")
  const totalFlowDays = periods.reduce(
    (sum, p) => sum + p.flowIntensity.light + p.flowIntensity.medium + p.flowIntensity.heavy + p.flowIntensity.unspecified,
    0,
  );
  const flowDistribution = {
    light: totalFlowDays > 0
      ? roundNumber(periods.reduce((s, p) => s + p.flowIntensity.light, 0) / totalFlowDays * 100) ?? 0
      : 0,
    medium: totalFlowDays > 0
      ? roundNumber(periods.reduce((s, p) => s + p.flowIntensity.medium, 0) / totalFlowDays * 100) ?? 0
      : 0,
    heavy: totalFlowDays > 0
      ? roundNumber(periods.reduce((s, p) => s + p.flowIntensity.heavy, 0) / totalFlowDays * 100) ?? 0
      : 0,
    unspecified: totalFlowDays > 0
      ? roundNumber(periods.reduce((s, p) => s + p.flowIntensity.unspecified, 0) / totalFlowDays * 100) ?? 0
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
      ? roundNumber(intermenstrualBleedingCount / (cycleLengths.length + 1))
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

  // Notes
  const notes: string[] = [];
  if (periods.length < 3) {
    notes.push("月经周期记录较少，周期规律性评估可信度有限。");
  }
  if (contraceptiveUse) {
    notes.push(`检测到避孕药使用记录（${contraceptiveUse}），可能影响周期规律性。`);
  }
  if (intermenstrualBleedingCount > 0) {
    notes.push(`检测到 ${intermenstrualBleedingCount} 次经间期出血记录。`);
  }

  // Warnings
  if (regularity === "irregular") {
    warnings.push({
      code: "menstrual_irregular",
      module: "menstrualCycle",
      message: `月经周期不规律，周期标准差 ${cycleLengthStd} 天。`,
    });
  }
  if (avgCycleLength !== null && (avgCycleLength < 21 || avgCycleLength > 38)) {
    warnings.push({
      code: "menstrual_cycle_length",
      module: "menstrualCycle",
      message: `平均周期 ${avgCycleLength} 天，偏离正常范围（21-38 天）。`,
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
        avgCycleLengthDays: roundNumber(average(recent90dCycleLengths)),
        intermenstrualBleedingDays: recent90dIntermenstrual.length,
      },
      historical: {
        periods: historicalPeriods.length,
        avgCycleLengthDays: roundNumber(average(historicalCycleLengths)),
      },
      notes,
    },
    warnings,
  };
}
