import { describe, expect, it } from "vitest";

import {
  ATL_ALPHA,
  ATL_DAYS,
  CTL_ALPHA,
  CTL_DAYS,
  buildDailyLoadSeries,
  computeEwma,
  computeTrainingLoadSeries,
  estimateWorkoutTLoad,
} from "../src/analyzers/trainingLoad.js";
import type { WorkoutSample } from "../src/types.js";

function workout(
  type: string,
  start: string,
  durationMinutes: number | null,
  extras: Partial<WorkoutSample> = {},
): WorkoutSample {
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + (durationMinutes ?? 0) * 60 * 1000);
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

describe("trainingLoad constants", () => {
  it("derives EWMA alphas from the ATL/CTL day constants", () => {
    expect(ATL_DAYS).toBe(7);
    expect(CTL_DAYS).toBe(42);
    expect(ATL_ALPHA).toBeCloseTo(0.25, 3);
    expect(CTL_ALPHA).toBeCloseTo(0.0465, 3);
  });
});

describe("estimateWorkoutTLoad", () => {
  it("uses averageMETs when present", () => {
    const load = estimateWorkoutTLoad(
      workout("HKWorkoutActivityTypeBoxing", "2026-03-01T08:00:00Z", 60, { averageMETs: 9 }),
    );
    expect(load).toBe(540);
  });

  it("falls back to the HK workout-type MET table when averageMETs is missing", () => {
    const load = estimateWorkoutTLoad(
      workout("HKWorkoutActivityTypeWalking", "2026-03-01T08:00:00Z", 40),
    );
    // walking fallback = 3.5 MET
    expect(load).toBe(140);
  });

  it("returns null when duration is missing or non-positive", () => {
    expect(
      estimateWorkoutTLoad(workout("HKWorkoutActivityTypeRunning", "2026-03-01T08:00:00Z", null)),
    ).toBeNull();
    expect(
      estimateWorkoutTLoad(workout("HKWorkoutActivityTypeRunning", "2026-03-01T08:00:00Z", 0)),
    ).toBeNull();
  });
});

describe("buildDailyLoadSeries", () => {
  it("fills zero for days without workouts within the range", () => {
    const series = buildDailyLoadSeries(
      [
        workout("HKWorkoutActivityTypeBoxing", "2026-03-01T08:00:00Z", 60, { averageMETs: 9 }),
        workout("HKWorkoutActivityTypeBoxing", "2026-03-05T08:00:00Z", 30, { averageMETs: 9 }),
      ],
      new Date("2026-03-01T00:00:00Z"),
      new Date("2026-03-07T23:59:59Z"),
    );
    expect(series.map((s) => s.date)).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
    ]);
    expect(series[0].load).toBe(540);
    expect(series[1].load).toBe(0);
    expect(series[4].load).toBe(270);
  });

  it("aggregates multiple workouts on the same day", () => {
    const series = buildDailyLoadSeries(
      [
        workout("HKWorkoutActivityTypeWalking", "2026-03-02T08:00:00Z", 30),
        workout("HKWorkoutActivityTypeRunning", "2026-03-02T18:00:00Z", 40),
      ],
      new Date("2026-03-02T00:00:00Z"),
      new Date("2026-03-02T23:59:59Z"),
    );
    expect(series).toHaveLength(1);
    // walking (3.5) * 30 + running (8.5) * 40 = 105 + 340 = 445
    expect(series[0].load).toBe(445);
  });
});

describe("computeEwma", () => {
  it("relaxes toward the steady-state load when given a constant series", () => {
    const constant = Array.from({ length: 60 }, () => ({ load: 100 }));
    const ewma = computeEwma(constant, CTL_ALPHA);
    // after 60 days the CTL should converge well above 90% of steady state
    expect(ewma[59]).toBeGreaterThan(90);
    expect(ewma[59]).toBeLessThan(101);
  });

  it("reacts faster for ATL than CTL on the same spike", () => {
    const series = [
      ...Array.from({ length: 20 }, () => ({ load: 0 })),
      { load: 500 },
      ...Array.from({ length: 20 }, () => ({ load: 0 })),
    ];
    const atl = computeEwma(series, ATL_ALPHA);
    const ctl = computeEwma(series, CTL_ALPHA);
    // right after the spike, ATL should be higher than CTL
    expect(atl[20]).toBeGreaterThan(ctl[20]);
    // ATL should decay closer to zero within 14 days
    expect(atl[34]).toBeLessThan(ctl[34]);
  });
});

describe("computeTrainingLoadSeries", () => {
  it("produces a status snapshot with TSB = CTL - ATL", () => {
    const workouts = [
      workout("HKWorkoutActivityTypeBoxing", "2026-03-01T08:00:00Z", 60, { averageMETs: 9 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-03T08:00:00Z", 60, { averageMETs: 9 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-06T08:00:00Z", 60, { averageMETs: 9 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-07T08:00:00Z", 45, { averageMETs: 9 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-08T08:00:00Z", 45, { averageMETs: 9 }),
      workout("HKWorkoutActivityTypeBoxing", "2026-03-09T08:00:00Z", 45, { averageMETs: 9 }),
    ];
    const { daily, status } = computeTrainingLoadSeries(
      workouts,
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-03-10T23:59:59Z"),
    );
    expect(status).not.toBeNull();
    expect(daily.length).toBeGreaterThan(30);
    const last = daily[daily.length - 1];
    expect(last.tsb).toBeCloseTo(last.ctl - last.atl, 1);
    expect(status?.asOfDate).toBe(last.date);
    expect(status?.warmupDays).toBe(daily.length);
    expect(status?.activeDays).toBe(6);
  });

  it("returns a null status when there are no workouts in range", () => {
    const { daily, status } = computeTrainingLoadSeries(
      [],
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-02-10T00:00:00Z"),
    );
    expect(daily.length).toBeGreaterThan(0);
    expect(status).toBeNull();
  });

  it("keeps the daily curve but withholds status below minimum coverage or workout count", () => {
    const sixWorkouts = Array.from({ length: 6 }, (_, index) =>
      workout(
        "HKWorkoutActivityTypeRunning",
        `2026-03-${String(index + 1).padStart(2, "0")}T08:00:00Z`,
        40,
      ),
    );

    const shortCoverage = computeTrainingLoadSeries(
      sixWorkouts,
      new Date("2026-03-01T00:00:00Z"),
      new Date("2026-03-20T23:59:59Z"),
    );
    expect(shortCoverage.daily).toHaveLength(20);
    expect(shortCoverage.status).toBeNull();

    const tooFewWorkouts = computeTrainingLoadSeries(
      sixWorkouts.slice(0, 5),
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-03-20T23:59:59Z"),
    );
    expect(tooFewWorkouts.daily.length).toBeGreaterThanOrEqual(28);
    expect(tooFewWorkouts.status).toBeNull();
  });
});
