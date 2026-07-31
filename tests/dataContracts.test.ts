import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { analyzeMenstrualCycle } from "../src/analyzers/menstrualCycle.js";
import { buildNightSummaries, summarizeSleepWindow } from "../src/analyzers/sleepShared.js";
import { getTranslations } from "../src/i18n/index.js";
import { menstrualCycleZh } from "../src/i18n/zh/menstrualCycle.js";
import { parseHealthExport } from "../src/io/streamHealthXml.js";
import { buildTimeWindow } from "../src/normalize/buildTimeWindow.js";
import { deduplicateWorkouts } from "../src/normalize/deduplicateWorkouts.js";
import { selectPrimarySources } from "../src/normalize/selectPrimarySources.js";
import { prepareAnalysis } from "../src/pipeline/prepareAnalysis.js";
import type { MenstrualFlowSample, SleepSample, WorkoutSample } from "../src/types.js";

function mockXmlEntry(xml: string) {
  return {
    path: "apple_health_export/export.xml",
    type: "File",
    stream: () => Readable.from([xml]),
  };
}

describe("data contracts", () => {
  it("uses exactly 30 recent calendar days and 90 baseline calendar days", () => {
    const window = buildTimeWindow(
      undefined,
      undefined,
      new Date("2026-03-31T14:23:00.000Z"),
    );

    expect(window.recentStart.toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(window.baselineStart.toISOString()).toBe("2025-12-02T00:00:00.000Z");
  });

  it("parses CLI calendar dates strictly and independently of the host timezone", () => {
    const window = buildTimeWindow(
      "2026-03-01",
      "2026-03-31",
      new Date("2026-04-01T12:00:00.000Z"),
    );

    expect(window.effectiveStart?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(window.effectiveEnd.toISOString()).toBe("2026-03-31T23:59:59.999Z");
    expect(() =>
      buildTimeWindow(undefined, "2026-02-30", new Date("2026-03-01T00:00:00.000Z")),
    ).toThrow(/Invalid date/);
    expect(() =>
      buildTimeWindow(undefined, "2026-3-1", new Date("2026-03-01T00:00:00.000Z")),
    ).toThrow(/Invalid date/);

    const singaporeWindow = buildTimeWindow(
      "2026-03-01",
      "2026-03-01",
      new Date("2026-03-02T00:00:00.000Z"),
      480,
    );
    expect(singaporeWindow.effectiveStart?.toISOString()).toBe(
      "2026-02-28T16:00:00.000Z",
    );
    expect(singaporeWindow.effectiveEnd.toISOString()).toBe(
      "2026-03-01T15:59:59.999Z",
    );
  });

  it("normalizes supported units and isolates unsafe values and epoch activity sentinels", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
  <ExportDate value="2026-04-01 10:00:00 +0000"/>
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="lb" value="170" startDate="2026-03-01 08:00:00 +0800" endDate="2026-03-01 08:00:00 +0800"/>
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="bananas" value="70" startDate="2026-03-02 08:00:00 +0800" endDate="2026-03-02 08:00:00 +0800"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Watch" unit="s" value="0.05" startDate="2026-03-03 08:00:00 +0800" endDate="2026-03-03 08:00:00 +0800"/>
  <ActivitySummary dateComponents="1969-12-31" activeEnergyBurned="100" appleExerciseTime="10" appleStandHours="1"/>
  <ActivitySummary dateComponents="2026-03-03" activeEnergyBurned="300" appleExerciseTime="30" appleStandHours="8"/>
  <Workout sourceName="Watch" workoutActivityType="HKWorkoutActivityTypeRunning" duration="3600" durationUnit="s" startDate="2026-03-04 08:00:00 +0800" endDate="2026-03-04 09:00:00 +0800">
    <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="418.4" unit="kJ"/>
    <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceWalkingRunning" sum="1" unit="mi"/>
  </Workout>
</HealthData>`;
    const entry = mockXmlEntry(xml);
    const parsed = await parseHealthExport("/private/export.zip", [entry], entry);

    expect(parsed.records.bodyMass).toHaveLength(1);
    expect(parsed.records.bodyMass[0]).toMatchObject({
      unit: "kg",
      startTimezoneOffsetMinutes: 480,
    });
    expect(parsed.records.bodyMass[0]?.value).toBeCloseTo(77.11, 2);
    expect(parsed.records.hrv[0]).toMatchObject({ unit: "ms", value: 50 });
    expect(parsed.workouts[0]?.durationMinutes).toBe(60);
    expect(parsed.workouts[0]?.activeEnergyBurnedKcal).toBeCloseTo(100, 5);
    expect(parsed.workouts[0]?.distanceKm).toBeCloseTo(1.60934, 5);
    expect(parsed.activitySummaries).toHaveLength(1);
    expect(parsed.coverageStart?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(parsed.dataQuality).toMatchObject({
      excludedImplausibleActivitySummaries: 1,
      excludedUnsupportedUnitValues: 1,
    });
  });

  it("ranks usable in-window coverage ahead of stale wearable history", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
  <ExportDate value="2026-04-01 10:00:00 +0000"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Old Garmin Watch" unit="ms" value="40" startDate="2024-01-01 08:00:00 +0000" endDate="2024-01-01 08:00:00 +0000"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Current Phone" unit="ms" value="45" startDate="2026-03-10 08:00:00 +0000" endDate="2026-03-10 08:00:00 +0000"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Current Phone" unit="ms" value="47" startDate="2026-03-20 08:00:00 +0000" endDate="2026-03-20 08:00:00 +0000"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Old Watch" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="2024-01-01 23:00:00 +0000" endDate="2024-01-02 07:00:00 +0000"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Current Phone" value="HKCategoryValueSleepAnalysisAsleep" startDate="2026-03-20 23:00:00 +0000" endDate="2026-03-21 07:00:00 +0000"/>
</HealthData>`;
    const entry = mockXmlEntry(xml);
    const parsed = await parseHealthExport("/private/export.zip", [entry], entry);
    const window = buildTimeWindow("2026-03-01", "2026-03-31", parsed.exportDate!);
    const selected = selectPrimarySources(parsed, window);

    expect(selected.recovery.hrv?.displayName).toBe("Current Phone");
    expect(selected.recovery.hrv?.windowSampleCount).toBe(2);
    expect(selected.sleep?.displayName).toBe("Current Phone");
  });

  it("deduplicates only near-identical workouts and keeps the richer record", () => {
    const workout = (
      sourceName: string,
      start: string,
      durationMinutes: number,
      activeEnergyBurnedKcal: number | null,
    ): WorkoutSample => ({
      sourceName,
      canonicalSource: sourceName.toLowerCase(),
      workoutActivityType: "HKWorkoutActivityTypeRunning",
      durationMinutes,
      startDate: new Date(start),
      endDate: new Date(new Date(start).getTime() + durationMinutes * 60_000),
      activeEnergyBurnedKcal,
      basalEnergyBurnedKcal: null,
      distanceKm: activeEnergyBurnedKcal === null ? null : 5,
      averageHeartRateBpm: activeEnergyBurnedKcal === null ? null : 145,
      minHeartRateBpm: null,
      maxHeartRateBpm: null,
      averageMETs: null,
      isIndoor: null,
    });

    const result = deduplicateWorkouts([
      workout("Phone", "2026-03-01T08:00:00.000Z", 30, null),
      workout("Watch", "2026-03-01T08:00:30.000Z", 31, 280),
      workout("Watch", "2026-03-01T10:00:00.000Z", 30, 260),
    ]);

    expect(result.removedCount).toBe(1);
    expect(result.workouts).toHaveLength(2);
    expect(result.workouts[0]?.sourceName).toBe("Watch");
    expect(result.workouts[1]?.startDate.toISOString()).toBe(
      "2026-03-01T10:00:00.000Z",
    );
  });

  it("uses source timestamp offsets for stable sleep clock times", () => {
    const record: SleepSample = {
      metric: "sleep",
      sourceName: "Watch",
      canonicalSource: "watch",
      startDate: new Date("2026-03-01T15:30:00.000Z"),
      endDate: new Date("2026-03-01T23:00:00.000Z"),
      startTimezoneOffsetMinutes: 480,
      endTimezoneOffsetMinutes: 480,
      value: "HKCategoryValueSleepAnalysisAsleep",
    };

    const summary = summarizeSleepWindow(
      buildNightSummaries([record], new Date("2026-03-02T23:59:59.999Z")),
    );
    expect(summary.medianBedtime).toBe("23:30");
    expect(summary.medianWakeTime).toBe("07:00");
  });

  it("unions overlapping sleep stages and clamps records at the analysis end", () => {
    const record = (
      value: string,
      start: string,
      end: string,
    ): SleepSample => ({
      metric: "sleep",
      sourceName: "Watch",
      canonicalSource: "watch",
      startDate: new Date(start),
      endDate: new Date(end),
      value,
    });
    const records = [
      record(
        "HKCategoryValueSleepAnalysisAsleep",
        "2026-03-01T23:00:00.000Z",
        "2026-03-02T07:00:00.000Z",
      ),
      record(
        "HKCategoryValueSleepAnalysisAsleepCore",
        "2026-03-01T23:00:00.000Z",
        "2026-03-02T01:00:00.000Z",
      ),
      record(
        "HKCategoryValueSleepAnalysisAsleepCore",
        "2026-03-01T23:00:00.000Z",
        "2026-03-02T01:00:00.000Z",
      ),
      record(
        "HKCategoryValueSleepAnalysisAsleepREM",
        "2026-03-02T01:00:00.000Z",
        "2026-03-02T03:00:00.000Z",
      ),
    ];

    const nights = buildNightSummaries(
      records,
      new Date("2026-03-02T02:00:00.000Z"),
    );

    expect(nights).toHaveLength(1);
    expect(nights[0]?.totalSleepHours).toBe(3);
    expect(nights[0]?.coreHours).toBe(2);
    expect(nights[0]?.remHours).toBe(1);
    expect(nights[0]?.unspecifiedHours).toBe(0);
  });

  it("keeps menstrual analysis inside the explicit closed interval", () => {
    const sample = (date: string): MenstrualFlowSample => ({
      metric: "menstrualFlow",
      sourceName: "Health",
      canonicalSource: "health",
      startDate: new Date(`${date}T08:00:00.000Z`),
      endDate: new Date(`${date}T08:00:00.000Z`),
      value: "HKCategoryValueMenstrualFlowMedium",
    });
    const window = buildTimeWindow("2026-01-01", "2026-03-01", new Date());
    const { result } = analyzeMenstrualCycle(
      [sample("2026-01-01"), sample("2026-02-01"), sample("2026-04-01")],
      [],
      [],
      window,
      menstrualCycleZh,
    );

    expect(result.totalPeriods).toBe(2);
    expect(result.recentCycles.map((cycle) => cycle.periodStart)).not.toContain("2026-04-01");
  });

  it("does not invent a doctor question for stable menstrual records", () => {
    const sample = (date: string): MenstrualFlowSample => ({
      metric: "menstrualFlow",
      sourceName: "Health",
      canonicalSource: "health",
      startDate: new Date(`${date}T08:00:00.000Z`),
      endDate: new Date(`${date}T08:00:00.000Z`),
      value: "HKCategoryValueMenstrualFlowMedium",
    });
    const periodStarts = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"];
    const samples = periodStarts.flatMap((start) => {
      const startDate = new Date(`${start}T08:00:00.000Z`);
      return [0, 1, 2].map((offset) =>
        sample(new Date(startDate.getTime() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
      );
    });
    const window = buildTimeWindow("2026-01-01", "2026-03-31", new Date());
    const { result } = analyzeMenstrualCycle(
      samples,
      [],
      [],
      window,
      menstrualCycleZh,
    );

    expect(result.regularity).toBe("regular");
    expect(result.healthInsights.doctorTalkingPoints).toEqual([]);
  });

  it("enforces --to across summaries, history, and chart points", async () => {
    const zipPath = new URL(
      "../fixtures/multi-source-export/export.zip",
      import.meta.url,
    ).pathname;
    const translations = await getTranslations("en");
    const prepared = await prepareAnalysis(
      zipPath,
      { to: "2026-03-01", locale: "en" },
      translations,
    );
    const cutoff = new Date("2026-03-01T23:59:59.999Z").getTime();

    for (const metric of Object.values(prepared.summary.recovery.metrics)) {
      if (metric?.latest) {
        expect(new Date(metric.latest.timestamp).getTime()).toBeLessThanOrEqual(cutoff);
      }
    }
    for (const metric of Object.values(prepared.summary.bodyComposition.metrics)) {
      if (metric?.latest) {
        expect(new Date(metric.latest.timestamp).getTime()).toBeLessThanOrEqual(cutoff);
      }
    }
    for (const metric of [
      ...Object.values(prepared.insights.historicalContext.recovery),
      ...Object.values(prepared.insights.historicalContext.bodyComposition),
    ]) {
      if (metric?.latest) {
        expect(new Date(metric.latest.timestamp).getTime()).toBeLessThanOrEqual(cutoff);
      }
    }
    for (const chart of [
      ...prepared.insights.charts,
      ...prepared.insights.training.charts,
    ]) {
      for (const series of chart.series) {
        for (const point of series.points) {
          expect(new Date(point.end).getTime()).toBeLessThanOrEqual(cutoff);
        }
      }
    }
    expect(
      new Date(prepared.insights.historicalContext.scope.latestSeen!).getTime(),
    ).toBeLessThanOrEqual(cutoff);
  });
});
