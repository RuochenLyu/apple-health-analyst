import { describe, expect, it } from "vitest";

import { buildTrainingInsights } from "../src/analyzers/training.js";
import { zhTranslations } from "../src/i18n/zh/index.js";
import { buildTimeWindow } from "../src/normalize/buildTimeWindow.js";
import type {
  InsightHistoricalContext,
  ParsedHealthExport,
  PrimarySources,
  QuantitySample,
  SleepSample,
  WorkoutSample,
} from "../src/types.js";

function workout(
  type: string,
  start: string,
  durationMinutes: number,
  extras: Partial<WorkoutSample> = {},
): WorkoutSample {
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return {
    sourceName: "Apple Watch",
    canonicalSource: "Apple Watch",
    workoutActivityType: type,
    durationMinutes,
    startDate,
    endDate,
    activeEnergyBurnedKcal: null,
    basalEnergyBurnedKcal: null,
    distanceKm: null,
    averageHeartRateBpm: null,
    minHeartRateBpm: null,
    maxHeartRateBpm: null,
    averageMETs: null,
    isIndoor: null,
    ...extras,
  };
}

function recoverySample(metric: QuantitySample["metric"], start: string, value: number): QuantitySample {
  const startDate = new Date(start);
  return {
    metric,
    value,
    unit: metric === "hrv" ? "ms" : "count/min",
    sourceName: "Apple Watch",
    canonicalSource: "Apple Watch",
    startDate,
    endDate: new Date(startDate.getTime() + 60 * 1000),
  };
}

function sleepRecord(nightKey: string, hours: number): SleepSample {
  const startDate = new Date(`${nightKey}T23:00:00Z`);
  return {
    metric: "sleep",
    value: "HKCategoryValueSleepAnalysisAsleep",
    sourceName: "Apple Watch",
    canonicalSource: "Apple Watch",
    startDate,
    endDate: new Date(startDate.getTime() + hours * 60 * 60 * 1000),
  };
}

function buildParsed(workouts: WorkoutSample[], sleep: SleepSample[], hrv: QuantitySample[], rhr: QuantitySample[]): ParsedHealthExport {
  return {
    inputPath: "/tmp/training-test.zip",
    mainXmlEntry: "export.xml",
    locale: "en_US",
    biologicalSex: null,
    exportDate: new Date("2026-03-31T23:59:59Z"),
    coverageStart: new Date("2025-08-01T00:00:00Z"),
    coverageEnd: new Date("2026-03-31T23:59:59Z"),
    recordCount: sleep.length + hrv.length + rhr.length,
    workoutCount: workouts.length,
    activitySummaryCount: 0,
    sources: [],
    records: {
      sleep,
      restingHeartRate: rhr,
      hrv,
      oxygenSaturation: [],
      respiratoryRate: [],
      vo2Max: [],
      bodyMass: [],
      bodyFatPercentage: [],
    },
    workouts,
    activitySummaries: [],
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

function buildHistoricalContext(): InsightHistoricalContext {
  return {
    scope: {
      earliestSeen: "2025-08-01",
      latestSeen: "2026-03-31",
      totalSpanDays: 240,
    },
    sleep: {
      recent30d: { avgSleepHours: 6.9 },
      recentVsBaseline90d: { sleepHours: -0.6 },
    } as InsightHistoricalContext["sleep"],
    recovery: {
      hrv: {
        recent30d: { average: 45 },
        baseline90d: { average: 50 },
      } as NonNullable<InsightHistoricalContext["recovery"]["hrv"]>,
      restingHeartRate: {
        recent30d: { average: 58 },
        baseline90d: { average: 54 },
      } as NonNullable<InsightHistoricalContext["recovery"]["restingHeartRate"]>,
    },
    activity: {} as InsightHistoricalContext["activity"],
    bodyComposition: {},
    interpretationHints: [],
  };
}

function buildPrimarySources(): PrimarySources {
  return {
    sleep: {
      canonicalName: "Apple Watch",
      displayName: "Apple Watch",
      rawNames: ["Apple Watch"],
      recentSampleCount: 30,
      totalSampleCount: 120,
      staged: false,
      recentNightCount: 30,
    },
    recovery: {
      hrv: {
        canonicalName: "Apple Watch",
        displayName: "Apple Watch",
        rawNames: ["Apple Watch"],
        recentSampleCount: 30,
        totalSampleCount: 120,
      },
      restingHeartRate: {
        canonicalName: "Apple Watch",
        displayName: "Apple Watch",
        rawNames: ["Apple Watch"],
        recentSampleCount: 30,
        totalSampleCount: 120,
      },
    },
    bodyComposition: {},
    activity: "Apple Watch",
  };
}

describe("training insights", () => {
  it("selects major sports, classifies strain, and keeps sport-specific metrics", () => {
    const workouts = [
      workout("HKWorkoutActivityTypeBoxing", "2025-12-10T08:00:00Z", 40, { averageHeartRateBpm: 146, maxHeartRateBpm: 174, averageMETs: 8.2, activeEnergyBurnedKcal: 360 }),
      workout("HKWorkoutActivityTypeRunning", "2026-01-05T08:00:00Z", 35, { distanceKm: 5, averageHeartRateBpm: 150, maxHeartRateBpm: 172, activeEnergyBurnedKcal: 310 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-01-15T08:00:00Z", 45, { averageHeartRateBpm: 148, maxHeartRateBpm: 176, averageMETs: 8.4, activeEnergyBurnedKcal: 380 }),
      workout("HKWorkoutActivityTypeRunning", "2026-02-05T08:00:00Z", 36, { distanceKm: 5.2, averageHeartRateBpm: 152, maxHeartRateBpm: 174, activeEnergyBurnedKcal: 320 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-02-10T08:00:00Z", 40, { averageHeartRateBpm: 149, maxHeartRateBpm: 178, averageMETs: 8.3, activeEnergyBurnedKcal: 365 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-02T08:00:00Z", 40, { distanceKm: 6, averageHeartRateBpm: 155, maxHeartRateBpm: 179, activeEnergyBurnedKcal: 340 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-05T08:00:00Z", 60, { averageHeartRateBpm: 156, maxHeartRateBpm: 182, averageMETs: 8.9, activeEnergyBurnedKcal: 470 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-09T08:00:00Z", 42, { distanceKm: 6.5, averageHeartRateBpm: 157, maxHeartRateBpm: 181, activeEnergyBurnedKcal: 350 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-12T08:00:00Z", 70, { averageHeartRateBpm: 158, maxHeartRateBpm: 184, averageMETs: 9.1, activeEnergyBurnedKcal: 520 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-19T08:00:00Z", 65, { averageHeartRateBpm: 157, maxHeartRateBpm: 183, averageMETs: 8.8, activeEnergyBurnedKcal: 500 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-23T08:00:00Z", 38, { distanceKm: 5.5, averageHeartRateBpm: 154, maxHeartRateBpm: 177, activeEnergyBurnedKcal: 330 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-25T08:00:00Z", 55, { averageHeartRateBpm: 155, maxHeartRateBpm: 181, averageMETs: 8.7, activeEnergyBurnedKcal: 455 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-27T08:00:00Z", 58, { averageHeartRateBpm: 156, maxHeartRateBpm: 182, averageMETs: 8.8, activeEnergyBurnedKcal: 465 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-29T08:00:00Z", 60, { averageHeartRateBpm: 157, maxHeartRateBpm: 183, averageMETs: 8.9, activeEnergyBurnedKcal: 485 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-30T08:00:00Z", 45, { distanceKm: 7, averageHeartRateBpm: 156, maxHeartRateBpm: 180, activeEnergyBurnedKcal: 400 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-31T08:00:00Z", 60, { averageHeartRateBpm: 158, maxHeartRateBpm: 184, averageMETs: 9.0, activeEnergyBurnedKcal: 495 }),
    ];

    const sleep = [
      sleepRecord("2026-03-03", 6.7),
      sleepRecord("2026-03-06", 6.4),
      sleepRecord("2026-03-10", 6.6),
      sleepRecord("2026-03-13", 6.1),
      sleepRecord("2026-03-20", 6.0),
      sleepRecord("2026-03-24", 6.5),
      sleepRecord("2026-03-26", 6.2),
      sleepRecord("2026-03-28", 6.1),
    ];
    const hrv = [
      recoverySample("hrv", "2026-03-03T08:00:00Z", 41),
      recoverySample("hrv", "2026-03-06T08:00:00Z", 39),
      recoverySample("hrv", "2026-03-10T08:00:00Z", 42),
      recoverySample("hrv", "2026-03-13T08:00:00Z", 38),
      recoverySample("hrv", "2026-03-20T08:00:00Z", 37),
      recoverySample("hrv", "2026-03-24T08:00:00Z", 40),
      recoverySample("hrv", "2026-03-26T08:00:00Z", 39),
      recoverySample("hrv", "2026-03-28T08:00:00Z", 38),
    ];
    const rhr = [
      recoverySample("restingHeartRate", "2026-03-03T08:00:00Z", 60),
      recoverySample("restingHeartRate", "2026-03-06T08:00:00Z", 61),
      recoverySample("restingHeartRate", "2026-03-10T08:00:00Z", 59),
      recoverySample("restingHeartRate", "2026-03-13T08:00:00Z", 62),
      recoverySample("restingHeartRate", "2026-03-20T08:00:00Z", 63),
      recoverySample("restingHeartRate", "2026-03-24T08:00:00Z", 60),
      recoverySample("restingHeartRate", "2026-03-26T08:00:00Z", 61),
      recoverySample("restingHeartRate", "2026-03-28T08:00:00Z", 62),
    ];

    const parsed = buildParsed(workouts, sleep, hrv, rhr);
    const window = buildTimeWindow(undefined, undefined, new Date("2026-03-31T23:59:59Z"));

    const training = buildTrainingInsights(
      parsed,
      buildPrimarySources(),
      window,
      buildHistoricalContext(),
      false,
      zhTranslations.trainingInsights,
    );

    expect(training.summary.trainingState).toBe("strained");
    expect(training.summary.readiness).toBe("low");
    expect(training.summary.primarySportLabel).toBe("拳击");
    expect(training.summary.loadTrend.recentVsBaseline90d.durationMinutesPer30d).toBeGreaterThan(0);
    expect(training.sports.map((sport) => sport.id)).toEqual(["boxing", "running"]);
    expect(training.charts.map((chart) => chart.id)).toEqual([
      "training_load",
      "training_recovery",
      "sport_boxing_trend",
      "sport_running_trend",
    ]);

    const boxing = training.sports.find((sport) => sport.id === "boxing");
    const running = training.sports.find((sport) => sport.id === "running");

    expect(boxing?.recent30d.averageHeartRateBpm).not.toBeNull();
    expect(boxing?.recent30d.totalDistanceKm).toBeNull();
    expect(boxing?.trailing365d.averageHeartRateBpm).not.toBeNull();
    expect(boxing?.recoveryAfterWorkout.sampleCount).toBeGreaterThan(0);
    expect(boxing?.statusTags).toContain("load rising");
    expect(boxing?.statusTags).toContain("recovery unknown");

    expect(running?.recent30d.totalDistanceKm).toBe(25);
    expect(running?.recent30d.averageHeartRateBpm).not.toBeNull();
    expect(running?.allTime.averageHeartRateBpm).not.toBeNull();
  });

  it("filters out sports that have been dormant for 6+ months", () => {
    const workouts = [
      // Cycling: 2 sessions over a year ago, none in the last 180 days -> dormant.
      workout("HKWorkoutActivityTypeCycling", "2024-11-10T08:00:00Z", 60, { averageMETs: 6.5 }),
      workout("HKWorkoutActivityTypeCycling", "2024-12-15T08:00:00Z", 45, { averageMETs: 6.5 }),
      // Walking: plenty of recent activity.
      workout("HKWorkoutActivityTypeWalking", "2026-02-01T08:00:00Z", 40),
      workout("HKWorkoutActivityTypeWalking", "2026-02-15T08:00:00Z", 35),
      workout("HKWorkoutActivityTypeWalking", "2026-03-01T08:00:00Z", 40),
      workout("HKWorkoutActivityTypeWalking", "2026-03-15T08:00:00Z", 40),
      workout("HKWorkoutActivityTypeWalking", "2026-03-20T08:00:00Z", 30),
      workout("HKWorkoutActivityTypeWalking", "2026-03-25T08:00:00Z", 35),
    ];

    const parsed = buildParsed(workouts, [], [], []);
    const window = buildTimeWindow(undefined, undefined, new Date("2026-03-31T23:59:59Z"));

    const training = buildTrainingInsights(
      parsed,
      buildPrimarySources(),
      window,
      buildHistoricalContext(),
      true,
      zhTranslations.trainingInsights,
    );

    // Cycling must be filtered out — no activity in the last 180 days,
    // < 3 in the last 365 days.
    expect(training.sports.map((sport) => sport.id)).toEqual(["walking"]);
  });

  it("does not infer strain or readiness from MET-minute balance without recovery evidence", () => {
    const workouts = [
      workout("HKWorkoutActivityTypeRunning", "2026-02-15T08:00:00Z", 45, { averageMETs: 8.5 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-27T08:00:00Z", 90, { averageMETs: 10 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-28T08:00:00Z", 90, { averageMETs: 10 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-29T08:00:00Z", 90, { averageMETs: 10 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-30T08:00:00Z", 90, { averageMETs: 10 }),
      workout("HKWorkoutActivityTypeRunning", "2026-03-31T08:00:00Z", 90, { averageMETs: 10 }),
    ];
    const context = buildHistoricalContext();
    context.sleep.recentVsBaseline90d.sleepHours = null;
    context.recovery = {};

    const training = buildTrainingInsights(
      buildParsed(workouts, [], [], []),
      buildPrimarySources(),
      buildTimeWindow(undefined, undefined, new Date("2026-03-31T23:59:59Z")),
      context,
      null,
      zhTranslations.trainingInsights,
    );

    expect(training.summary.trainingLoad).not.toBeNull();
    expect(training.summary.trainingLoad!.tsb).toBeLessThan(-30);
    expect(training.summary.trainingState).not.toBe("strained");
    expect(training.summary.readiness).toBe("insufficient_data");
  });

  it("does not treat missing post-workout recovery metrics as zero-valued support", () => {
    const workouts = [
      workout("HKWorkoutActivityTypeWalking", "2026-01-15T08:00:00Z", 40),
      workout("HKWorkoutActivityTypeWalking", "2026-03-01T08:00:00Z", 40),
      workout("HKWorkoutActivityTypeWalking", "2026-03-05T08:00:00Z", 40),
      workout("HKWorkoutActivityTypeWalking", "2026-03-10T08:00:00Z", 40),
      workout("HKWorkoutActivityTypeWalking", "2026-03-15T08:00:00Z", 40),
      workout("HKWorkoutActivityTypeWalking", "2026-03-20T08:00:00Z", 40),
    ];
    const sleep = [
      sleepRecord("2026-03-02", 7),
      sleepRecord("2026-03-06", 7),
      sleepRecord("2026-03-11", 7),
      sleepRecord("2026-03-16", 7),
      sleepRecord("2026-03-21", 7),
      sleepRecord("2026-03-03", 8),
      sleepRecord("2026-03-08", 8),
      sleepRecord("2026-03-13", 8),
      sleepRecord("2026-03-18", 8),
      sleepRecord("2026-03-23", 8),
    ];

    const training = buildTrainingInsights(
      buildParsed(workouts, sleep, [], []),
      buildPrimarySources(),
      buildTimeWindow(undefined, undefined, new Date("2026-03-31T23:59:59Z")),
      buildHistoricalContext(),
      null,
      zhTranslations.trainingInsights,
    );

    const walking = training.sports.find((sport) => sport.id === "walking");
    expect(walking?.recoveryAfterWorkout.sampleCount).toBeGreaterThanOrEqual(3);
    expect(walking?.recoveryAfterWorkout.nextDaySleepHoursDelta).toBe(-1);
    expect(walking?.recoveryAfterWorkout.sleepComparatorSampleCount).toBe(5);
    expect(walking?.recoveryAfterWorkout.nextDayHrvDelta).toBeNull();
    expect(walking?.recoveryAfterWorkout.nextDayRestingHeartRateDelta).toBeNull();
    expect(walking?.statusTags).toContain("recovery unknown");
  });

  it("labels one concerning and one neutral recovery signal as mixed", () => {
    const workoutDates = ["01", "05", "10", "15", "20"];
    const postDates = ["02", "06", "11", "16", "21"];
    const comparatorDates = ["03", "08", "13", "18", "23"];
    const workouts = workoutDates.map((day) =>
      workout(
        "HKWorkoutActivityTypeWalking",
        `2026-03-${day}T08:00:00Z`,
        40,
      ),
    );
    const sleep = [
      ...postDates.map((day) => sleepRecord(`2026-03-${day}`, 7)),
      ...comparatorDates.map((day) => sleepRecord(`2026-03-${day}`, 8)),
    ];
    const hrv = [...postDates, ...comparatorDates].map((day) =>
      recoverySample("hrv", `2026-03-${day}T08:00:00Z`, 50),
    );

    const training = buildTrainingInsights(
      buildParsed(workouts, sleep, hrv, []),
      buildPrimarySources(),
      buildTimeWindow(
        undefined,
        undefined,
        new Date("2026-03-31T23:59:59Z"),
      ),
      buildHistoricalContext(),
      null,
      zhTranslations.trainingInsights,
    );

    const walking = training.sports.find((sport) => sport.id === "walking");
    expect(walking?.recoveryAfterWorkout.nextDaySleepHoursDelta).toBe(-1);
    expect(walking?.recoveryAfterWorkout.nextDayHrvDelta).toBe(0);
    expect(walking?.statusTags).toContain("recovery mixed");
    expect(walking?.statusTags).not.toContain("recovery concern");
  });

  it("keeps monthly sport chart ranges inside the UTC analysis window", () => {
    const parsed = buildParsed(
      [
        workout("HKWorkoutActivityTypeWalking", "2026-06-24T18:00:00Z", 40),
        workout("HKWorkoutActivityTypeWalking", "2026-06-30T18:00:00Z", 40),
      ],
      [],
      [],
      [],
    );
    parsed.exportDate = new Date("2026-06-30T23:59:59Z");
    parsed.coverageEnd = parsed.exportDate;
    const window = buildTimeWindow(
      undefined,
      undefined,
      new Date("2026-06-30T23:59:59Z"),
    );

    const training = buildTrainingInsights(
      parsed,
      buildPrimarySources(),
      window,
      buildHistoricalContext(),
      null,
      zhTranslations.trainingInsights,
    );

    const walking = training.sports.find((sport) => sport.id === "walking");
    expect(walking?.consistency.recentMonths.at(-1)?.month).toBe("2026-06");
    const chart = training.charts.find(
      (entry) => entry.id === "sport_walking_trend",
    );
    for (const point of chart?.series.flatMap((series) => series.points) ?? []) {
      expect(point.start <= point.end).toBe(true);
      expect(point.end <= "2026-06-30").toBe(true);
    }
  });

  it("respects the topSportCount option", () => {
    // 4 active sports, all eligible.
    const workouts = [
      ...Array.from({ length: 6 }, (_, i) =>
        workout(
          "HKWorkoutActivityTypeBoxing",
          `2026-03-0${i + 1}T08:00:00Z`,
          45,
          { averageMETs: 8.5 },
        ),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        workout(
          "HKWorkoutActivityTypeRunning",
          `2026-03-1${i}T08:00:00Z`,
          35,
          { averageMETs: 8.5 },
        ),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        workout(
          "HKWorkoutActivityTypeWalking",
          `2026-03-2${i}T08:00:00Z`,
          35,
        ),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        workout(
          "HKWorkoutActivityTypeCycling",
          `2026-02-0${i + 1}T08:00:00Z`,
          30,
          { averageMETs: 6.5 },
        ),
      ),
    ];
    const parsed = buildParsed(workouts, [], [], []);
    const window = buildTimeWindow(undefined, undefined, new Date("2026-03-31T23:59:59Z"));

    const trainingDefault = buildTrainingInsights(
      parsed,
      buildPrimarySources(),
      window,
      buildHistoricalContext(),
      true,
      zhTranslations.trainingInsights,
    );
    expect(trainingDefault.sports.length).toBeGreaterThanOrEqual(3);

    const trainingCapped = buildTrainingInsights(
      parsed,
      buildPrimarySources(),
      window,
      buildHistoricalContext(),
      true,
      zhTranslations.trainingInsights,
      { topSportCount: 2 },
    );
    expect(trainingCapped.sports).toHaveLength(2);
  });

  it("clips HRV / resting-HR samples to the requested window", () => {
    // Regression: hrvByDay / restingHeartRateByDay used to ingest all
    // samples for the source, so `--from` / `--to` analyses bled recovery
    // data from outside the window into `buildRecoveryAfterWorkout`.
    const workouts = [
      workout("HKWorkoutActivityTypeBoxing", "2026-03-05T08:00:00Z", 60, { averageMETs: 9 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-12T08:00:00Z", 60, { averageMETs: 9 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-19T08:00:00Z", 60, { averageMETs: 9 }),
    ];
    const hrvInWindow = [
      recoverySample("hrv", "2026-03-06T08:00:00Z", 45),
      recoverySample("hrv", "2026-03-13T08:00:00Z", 42),
      recoverySample("hrv", "2026-03-20T08:00:00Z", 40),
    ];
    // Out-of-window HRV samples that MUST NOT influence the analysis.
    const hrvOutOfWindow = [
      recoverySample("hrv", "2024-05-10T08:00:00Z", 200),
      recoverySample("hrv", "2024-05-11T08:00:00Z", 200),
      recoverySample("hrv", "2024-05-12T08:00:00Z", 200),
    ];
    const rhrInWindow = [
      recoverySample("restingHeartRate", "2026-03-06T08:00:00Z", 60),
      recoverySample("restingHeartRate", "2026-03-13T08:00:00Z", 61),
      recoverySample("restingHeartRate", "2026-03-20T08:00:00Z", 62),
    ];
    const rhrOutOfWindow = [
      recoverySample("restingHeartRate", "2024-05-10T08:00:00Z", 200),
    ];

    const parsed = buildParsed(
      workouts,
      [],
      [...hrvInWindow, ...hrvOutOfWindow],
      [...rhrInWindow, ...rhrOutOfWindow],
    );
    const window = buildTimeWindow(
      "2026-01-01",
      "2026-03-31",
      new Date("2026-03-31T23:59:59Z"),
    );

    const training = buildTrainingInsights(
      parsed,
      buildPrimarySources(),
      window,
      buildHistoricalContext(),
      true,
      zhTranslations.trainingInsights,
    );

    // If out-of-window samples leaked, the boxing recoveryAfterWorkout
    // deltas would be driven by the absurd HRV=200 / RHR=200 values.
    const boxing = training.sports.find((sport) => sport.id === "boxing");
    expect(boxing).toBeDefined();
    const hrvDelta = boxing!.recoveryAfterWorkout.nextDayHrvDelta;
    const rhrDelta = boxing!.recoveryAfterWorkout.nextDayRestingHeartRateDelta;
    if (hrvDelta !== null) {
      expect(Math.abs(hrvDelta)).toBeLessThan(80);
    }
    if (rhrDelta !== null) {
      expect(Math.abs(rhrDelta)).toBeLessThan(80);
    }
  });
});
