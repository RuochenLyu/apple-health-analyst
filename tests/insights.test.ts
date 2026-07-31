import { describe, expect, it } from "vitest";

import { zhTranslations } from "../src/i18n/zh/index.js";
import { crossMetricEn } from "../src/i18n/en/crossMetric.js";
import { insightsEn } from "../src/i18n/en/insights.js";
import { insightsZh } from "../src/i18n/zh/insights.js";
import {
  buildDataGaps,
  buildRiskFlags,
  buildSourceConfidence,
} from "../src/insights/buildInsightBundle.js";
import { compressTimeSeries } from "../src/insights/chartUtils.js";
import { prepareAnalysis } from "../src/pipeline/prepareAnalysis.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

describe("insights helpers", () => {
  it("renders singular and plural English coverage labels", () => {
    expect(insightsEn.sleepPartialNightsGap(1)).toContain("1 sleep night excluded");
    expect(insightsEn.sleepPartialNightsGap(2)).toContain("2 sleep nights excluded");
    expect(crossMetricEn.sleepRecoveryTolerable(1)).toContain("1 night had");
    expect(crossMetricEn.sleepRecoveryTolerable(2)).toContain("2 nights had");
    expect(crossMetricEn.activityRecoveryInsufficientHrv(1)).toContain("1 day had");
    expect(crossMetricEn.activityRecoveryInsufficientHrv(2)).toContain("2 days had");
  });

  it("selects one readable granularity for the full chart span", () => {
    const anchor = new Date("2026-03-27T00:00:00Z");
    const valuesForDays = (days: number) =>
      Array.from({ length: days }, (_, index) => ({
        timestamp: new Date(anchor.getTime() - index * 24 * 60 * 60 * 1000),
        value: 100 - index,
      }));

    const daily = compressTimeSeries(valuesForDays(60), anchor, "average");
    const weekly = compressTimeSeries(valuesForDays(240), anchor, "average");
    const monthly = compressTimeSeries(valuesForDays(900), anchor, "average");

    expect(new Set(daily.map((point) => point.granularity))).toEqual(new Set(["day"]));
    expect(new Set(weekly.map((point) => point.granularity))).toEqual(new Set(["week"]));
    expect(new Set(monthly.map((point) => point.granularity))).toEqual(new Set(["month"]));
    expect(weekly.length).toBeLessThan(240);
    expect(monthly.length).toBeLessThan(900);
  });

  it("keeps uniform chart buckets calendar-aligned and non-overlapping", () => {
    const anchor = new Date("2026-07-30T07:00:00Z");
    const values = Array.from({ length: 480 }, (_, index) => ({
      timestamp: new Date(anchor.getTime() - index * 12 * 60 * 60 * 1000),
      value: index,
    }));

    const compressed = compressTimeSeries(values, anchor, "average");
    expect(new Set(compressed.map((point) => point.granularity))).toEqual(
      new Set(["week"]),
    );
    expect(compressed.reduce((sum, point) => sum + point.sampleCount, 0)).toBe(
      values.length,
    );

    for (let index = 1; index < compressed.length; index += 1) {
      const previous = compressed[index - 1];
      const current = compressed[index];
      expect(Date.parse(current.start)).toBeGreaterThan(Date.parse(previous.end));
    }
  });

  it("emits recovery stress and sleep decline risk flags when signals worsen together", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const stressed = structuredClone(prepared.summary);

    stressed.sleep.delta.sleepHours = -1.2;
    stressed.sleep.recent30d.avgSleepHours = 5.2;
    stressed.recovery.metrics.restingHeartRate!.delta = 4;
    stressed.recovery.metrics.hrv!.delta = -7;

    const flags = buildRiskFlags(stressed, insightsZh);

    expect(flags.map((flag) => flag.id)).toContain("sleep_decline");
    expect(flags.map((flag) => flag.id)).toContain("recovery_stress");
    expect(flags.find((flag) => flag.id === "sleep_decline")?.seekCare).toBe(true);
  });

  it("marks missing samples as data gaps and downgrades source confidence", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const sparse = structuredClone(prepared.summary);

    sparse.sleep.coverageDays = 2;
    sparse.recovery.metrics.restingHeartRate = undefined;
    sparse.recovery.metrics.hrv = undefined;
    sparse.activity.recent30d.dayCount = 2;
    sparse.activity.recent30d.workouts = 0;
    sparse.bodyComposition.metrics.bodyMass = undefined;
    sparse.bodyComposition.metrics.bodyFatPercentage = undefined;

    const dataGaps = buildDataGaps(sparse, insightsZh);
    const confidence = buildSourceConfidence(sparse, insightsZh);

    expect(dataGaps.some((gap) => gap.id === "sleep_insufficient")).toBe(true);
    expect(dataGaps.some((gap) => gap.id === "activity_sparse")).toBe(true);
    expect(confidence.find((entry) => entry.module === "sleep")?.level).toBe("low");
    expect(confidence.find((entry) => entry.module === "bodyComposition")?.level).toBe("low");
  });

  it("bases coverage confidence on recent samples instead of stale history", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const stale = structuredClone(prepared.summary);

    stale.sleep.coverageDays = 400;
    stale.sleep.recent30d.nights = 2;

    const recoveryKeys = Object.keys(stale.recovery.metrics) as Array<
      keyof typeof stale.recovery.metrics
    >;
    expect(recoveryKeys).toHaveLength(5);
    recoveryKeys.forEach((key, index) => {
      const metric = stale.recovery.metrics[key]!;
      metric.coverageDays = 500;
      metric.sampleCount = 500;
      metric.recent30d.sampleCount = index < 3 ? 10 : 0;
      metric.recent30d.average = index < 3 ? metric.latest?.value ?? 1 : null;
      stale.recovery.sources[key] = "Watch";
    });

    for (const metric of Object.values(stale.bodyComposition.metrics)) {
      if (!metric) continue;
      metric.coverageDays = 500;
      metric.sampleCount = 500;
      metric.recent30d.sampleCount = 0;
      metric.recent30d.average = null;
    }

    const confidence = buildSourceConfidence(stale, insightsZh);
    const sleep = confidence.find((entry) => entry.module === "sleep");
    const recovery = confidence.find((entry) => entry.module === "recovery");
    const body = confidence.find((entry) => entry.module === "bodyComposition");

    expect(sleep?.level).toBe("low");
    expect(sleep?.summary).toContain("近 30 天覆盖 2 个夜晚");
    expect(recovery?.level).toBe("medium");
    expect(recovery?.summary).toContain("5 项已选恢复指标中有 3 项");
    expect(body?.level).toBe("low");
  });

  it("includes long-term historical context for narrative reasoning", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const workoutType = prepared.insights.historicalContext.activity.workoutTypes[0];
    const scope = prepared.insights.historicalContext.scope;
    const start = new Date(scope.earliestSeen!);
    const end = new Date(scope.latestSeen!);
    const expectedSpanDays =
      Math.floor(
        (Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
          Date.UTC(
            start.getUTCFullYear(),
            start.getUTCMonth(),
            start.getUTCDate(),
          )) /
          (24 * 60 * 60 * 1000),
      ) + 1;

    expect(scope.totalSpanDays).toBe(expectedSpanDays);
    expect(prepared.insights.historicalContext.sleep.trailing180d.nights).toBeGreaterThan(0);
    expect(prepared.insights.historicalContext.activity.allTime.workouts).toBeGreaterThanOrEqual(
      prepared.insights.analysis.activity.recent30d.workouts,
    );
    expect(prepared.insights.historicalContext.interpretationHints).toBeInstanceOf(Array);
    expect(workoutType).toBeDefined();
    expect(workoutType?.recentMonths).toHaveLength(12);
    expect(workoutType?.yearly.length).toBeGreaterThan(0);
  });
});
