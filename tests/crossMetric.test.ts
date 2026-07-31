import { describe, expect, it } from "vitest";

import { analyzeCrossMetrics } from "../src/analyzers/crossMetric.js";
import { zhTranslations } from "../src/i18n/zh/index.js";
import type {
  ActivitySummarySample,
  ParsedHealthExport,
  PrimarySources,
  QuantitySample,
  SleepSample,
  TimeWindow,
  WorkoutSample,
} from "../src/types.js";

const SOURCE = "Apple Watch";

function quantity(metric: QuantitySample["metric"], start: string, value: number): QuantitySample {
  const startDate = new Date(start);
  return {
    metric,
    value,
    sourceName: SOURCE,
    canonicalSource: SOURCE,
    startDate,
    endDate: new Date(startDate.getTime() + 60_000),
  };
}

function sleep(start: string, hours: number): SleepSample {
  const startDate = new Date(start);
  return {
    metric: "sleep",
    value: "HKCategoryValueSleepAnalysisAsleep",
    sourceName: SOURCE,
    canonicalSource: SOURCE,
    startDate,
    endDate: new Date(startDate.getTime() + hours * 60 * 60 * 1000),
  };
}

function workout(start: string, durationMinutes: number): WorkoutSample {
  const startDate = new Date(start);
  return {
    sourceName: SOURCE,
    canonicalSource: SOURCE,
    workoutActivityType: "HKWorkoutActivityTypeWalking",
    durationMinutes,
    startDate,
    endDate: new Date(startDate.getTime() + durationMinutes * 60_000),
    activeEnergyBurnedKcal: null,
    basalEnergyBurnedKcal: null,
    distanceKm: null,
    averageHeartRateBpm: null,
    minHeartRateBpm: null,
    maxHeartRateBpm: null,
    averageMETs: null,
    isIndoor: null,
  };
}

function parsedExport(input: {
  sleep?: SleepSample[];
  hrv?: QuantitySample[];
  workouts?: WorkoutSample[];
  activity?: ActivitySummarySample[];
}): ParsedHealthExport {
  const sleepRecords = input.sleep ?? [];
  const hrv = input.hrv ?? [];
  const workouts = input.workouts ?? [];
  const activity = input.activity ?? [];
  return {
    inputPath: "/tmp/cross-metric-test.zip",
    mainXmlEntry: "export.xml",
    locale: "en_US",
    biologicalSex: null,
    exportDate: new Date("2026-03-31T23:59:59Z"),
    coverageStart: new Date("2026-01-01T00:00:00Z"),
    coverageEnd: new Date("2026-03-31T23:59:59Z"),
    recordCount: sleepRecords.length + hrv.length,
    workoutCount: workouts.length,
    activitySummaryCount: activity.length,
    sources: [],
    records: {
      sleep: sleepRecords,
      restingHeartRate: [],
      hrv,
      oxygenSaturation: [],
      respiratoryRate: [],
      vo2Max: [],
      bodyMass: [],
      bodyFatPercentage: [],
    },
    workouts,
    activitySummaries: activity,
    menstrualFlow: [],
    intermenstrualBleeding: [],
    contraceptive: [],
    attachments: {
      ecgFiles: 0,
      workoutRouteFiles: 0,
      imageAttachments: 0,
      otherFiles: 0,
      exampleFiles: [],
    },
  };
}

function primarySources(): PrimarySources {
  const selected = {
    canonicalName: SOURCE,
    displayName: SOURCE,
    rawNames: [SOURCE],
    recentSampleCount: 10,
    totalSampleCount: 10,
  };
  return {
    sleep: {
      ...selected,
      staged: false,
      recentNightCount: 10,
    },
    recovery: { hrv: selected },
    bodyComposition: {},
    activity: SOURCE,
  };
}

function timeWindow(): TimeWindow {
  return {
    requestedFrom: new Date("2026-03-01T00:00:00Z"),
    requestedTo: new Date("2026-03-10T23:59:59.999Z"),
    effectiveStart: new Date("2026-03-01T00:00:00Z"),
    effectiveEnd: new Date("2026-03-10T23:59:59.999Z"),
    recentStart: new Date("2026-02-09T23:59:59.999Z"),
    baselineStart: new Date("2025-11-11T23:59:59.999Z"),
  };
}

describe("cross-metric analysis", () => {
  it("keeps source-local sleep clock times independent of the host timezone", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      const record = sleep("2026-03-01T15:30:00.000Z", 7.5);
      record.startTimezoneOffsetMinutes = 480;
      record.endTimezoneOffsetMinutes = 480;

      const analysis = analyzeCrossMetrics(
        parsedExport({ sleep: [record] }),
        primarySources(),
        timeWindow(),
        zhTranslations.crossMetric,
      );

      expect(analysis.dailyRows[0]).toMatchObject({
        date: "2026-03-01",
        bedtime: "23:30",
        wakeTime: "07:00",
      });
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it("strictly excludes samples after effectiveEnd", () => {
    const analysis = analyzeCrossMetrics(
      parsedExport({
        hrv: [
          quantity("hrv", "2026-03-05T08:00:00Z", 50),
          quantity("hrv", "2026-03-11T08:00:00Z", 500),
        ],
      }),
      primarySources(),
      timeWindow(),
      zhTranslations.crossMetric,
    );

    expect(analysis.dailyRows.map((row) => row.date)).toEqual(["2026-03-05"]);
    expect(analysis.dailyRows[0].hrv).toBe(50);
  });

  it("does not add Apple Exercise Time and overlapping workout duration", () => {
    const analysis = analyzeCrossMetrics(
      parsedExport({
        activity: [
          {
            date: new Date("2026-03-05T12:00:00Z"),
            activeEnergyBurned: 300,
            appleExerciseTime: 40,
            appleStandHours: 10,
          },
        ],
        workouts: [workout("2026-03-05T08:00:00Z", 30)],
      }),
      primarySources(),
      timeWindow(),
      zhTranslations.crossMetric,
    );

    expect(analysis.dailyRows[0]).toMatchObject({
      exerciseMinutes: 40,
      workoutMinutes: 30,
    });
    expect(analysis.activityRecoveryBalance.highStrainDays).toBe(0);
  });

  it("withholds sleep-recovery association below three pairs per group", () => {
    const analysis = analyzeCrossMetrics(
      parsedExport({
        sleep: [
          sleep("2026-03-01T22:00:00Z", 5.5),
          sleep("2026-03-03T22:00:00Z", 7),
        ],
        hrv: [
          quantity("hrv", "2026-03-02T08:00:00Z", 30),
          quantity("hrv", "2026-03-04T08:00:00Z", 60),
        ],
      }),
      primarySources(),
      timeWindow(),
      zhTranslations.crossMetric,
    );

    expect(analysis.sleepRecoveryLink.shortSleepPairedHrvDays).toBe(1);
    expect(analysis.sleepRecoveryLink.normalSleepPairedHrvDays).toBe(1);
    expect(analysis.sleepRecoveryLink.hrvDropOnPoorSleep).toBeNull();
    expect(analysis.sleepRecoveryLink.summary).toContain("不足");
  });

  it("withholds activity-recovery association below three pairs per group", () => {
    const analysis = analyzeCrossMetrics(
      parsedExport({
        activity: [
          {
            date: new Date("2026-03-01T12:00:00Z"),
            activeEnergyBurned: 500,
            appleExerciseTime: 60,
            appleStandHours: 10,
          },
          {
            date: new Date("2026-03-03T12:00:00Z"),
            activeEnergyBurned: 100,
            appleExerciseTime: 10,
            appleStandHours: 8,
          },
        ],
        hrv: [
          quantity("hrv", "2026-03-02T08:00:00Z", 30),
          quantity("hrv", "2026-03-04T08:00:00Z", 60),
        ],
      }),
      primarySources(),
      timeWindow(),
      zhTranslations.crossMetric,
    );

    expect(analysis.activityRecoveryBalance.highStrainPairedHrvDays).toBe(1);
    expect(analysis.activityRecoveryBalance.restDayPairedHrvDays).toBe(1);
    expect(analysis.activityRecoveryBalance.recoveryAdequate).toBeNull();
    expect(analysis.activityRecoveryBalance.summary).toContain("不足");
  });

  it("does not collapse consumer-device metrics into an unvalidated health score", () => {
    const days = [1, 2, 3, 4, 5, 6];
    const analysis = analyzeCrossMetrics(
      parsedExport({
        sleep: days.map((day) =>
          sleep(`2026-03-${String(day).padStart(2, "0")}T22:00:00Z`, 7.5),
        ),
        hrv: days.map((day) =>
          quantity(
            "hrv",
            `2026-03-${String(day + 1).padStart(2, "0")}T08:00:00Z`,
            55,
          ),
        ),
        activity: days.map((day) => ({
          date: new Date(
            `2026-03-${String(day).padStart(2, "0")}T12:00:00Z`,
          ),
          activeEnergyBurned: 350,
          appleExerciseTime: 30,
          appleStandHours: 10,
        })),
      }),
      primarySources(),
      timeWindow(),
      zhTranslations.crossMetric,
    );

    expect(analysis.compositeAssessment).toMatchObject({
      sleepScore: null,
      recoveryScore: null,
      activityScore: null,
      overallReadiness: null,
    });
    expect(analysis.compositeAssessment.summary).toContain("不生成");
  });
});
