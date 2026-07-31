import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { enTranslations } from "../src/i18n/en/index.js";
import { zhTranslations } from "../src/i18n/zh/index.js";
import { prepareAnalysis } from "../src/pipeline/prepareAnalysis.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

describe("prepare pipeline", () => {
  it("builds summary and insights with the expanded schema", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);

    expect(prepared.summary.sources.primary.sleep).toBe("Withings");
    expect(prepared.insights.metadata.schemaVersion).toBe("3.0.0");
    expect(prepared.insights.charts.map((chart) => chart.id)).toEqual([
      "sleep",
      "recovery",
      "activity",
      "bodyComposition",
    ]);
    expect(prepared.insights.historicalContext.scope.totalSpanDays).toBeGreaterThan(0);
    expect(prepared.insights.historicalContext.sleep.allTime.nights).toBeGreaterThan(0);
    expect(prepared.insights.narrativeContext.outputSchemaVersion).toBe("3.0.0");
    expect(prepared.insights.crossMetric).toBeDefined();
    expect(prepared.insights.crossMetric.compositeAssessment).toBeDefined();
    expect(prepared.insights.historicalContext.activity.workoutTypes.length).toBeGreaterThan(0);
    expect(prepared.insights.historicalContext.activity.workoutTypes[0]?.recentMonths).toHaveLength(12);
    expect(prepared.insights.training.summary.trainingState).toBeDefined();
    expect(prepared.insights.training.summary.readiness).toBeDefined();
    expect(prepared.insights.training.charts.map((chart) => chart.id)).toEqual(
      expect.arrayContaining([
        "training_load",
        "training_recovery",
      ]),
    );
    expect(prepared.insights.training.charts.some((chart) => chart.id.startsWith("sport_"))).toBe(true);
    expect(prepared.insights.training.narrativeContext.outputSchemaVersion).toBe("2.0.0");
  });

  it("prepare command writes summary and insights json", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-analyst-"));

    await runCli([
      "prepare",
      fixturePath("multi-source-export"),
      "--out",
      outDir,
    ]);

    const summary = JSON.parse(await readFile(path.join(outDir, "summary.json"), "utf8"));
    const insights = JSON.parse(await readFile(path.join(outDir, "insights.json"), "utf8"));

    expect(summary.input.zipPath).toBe("export.zip");
    expect(insights.metadata.schemaVersion).toBe("3.0.0");
    expect(insights.charts).toHaveLength(4);
    expect(insights.historicalContext.interpretationHints).toBeInstanceOf(Array);
    expect(insights.training).toBeDefined();
    expect(insights.training.charts.map((chart: { id: string }) => chart.id)).toEqual(
      expect.arrayContaining([
        "training_load",
        "training_recovery",
      ]),
    );
    expect(insights.training.charts.some((chart: { id: string }) => chart.id.startsWith("sport_"))).toBe(true);
  });

  it("localizes generated source labels instead of leaking Chinese into English output", async () => {
    const prepared = await prepareAnalysis(
      fixturePath("multi-source-export"),
      { locale: "en" },
      enTranslations,
    );

    expect(prepared.summary.sources.primary.activity).toBe(
      "Activity Summaries + Workout Records",
    );
    expect(prepared.insights.primarySources.activity).toBe(
      "Activity Summaries + Workout Records",
    );
  });

  it("keeps routine health context non-diagnostic and omits generic doctor prompts", async () => {
    const prepared = await prepareAnalysis(
      fixturePath("multi-source-export"),
      { locale: "en" },
      enTranslations,
    );
    const { sleep, recovery, activity } = prepared.summary;

    expect(sleep.healthInsights.doctorTalkingPoints).toEqual([]);
    expect(recovery.healthInsights.doctorTalkingPoints).toEqual([]);
    expect(activity.healthInsights.doctorTalkingPoints).toEqual([]);

    const sleepContext = [
      sleep.healthInsights.deepSleepAssessment,
      sleep.healthInsights.remSleepAssessment,
      sleep.healthInsights.normalRangeAssessment,
      sleep.healthInsights.interpretation,
    ].join(" ");
    expect(sleepContext).not.toMatch(/7-9|13-23|20-25/);

    expect(recovery.healthInsights.normalRangeAssessment).not.toMatch(
      /60-100|12-20|on the low side/,
    );

    const activityContext = [
      activity.healthInsights.whoGuidelineAssessment,
      activity.healthInsights.normalRangeAssessment,
      activity.healthInsights.interpretation,
      ...activity.healthInsights.actionableAdvice,
    ].join(" ");
    expect(activityContext).not.toMatch(/\b150\b|\b300\b|10-15|Apple Watch/);
    expect(activityContext).toContain("cannot determine");
  });
});
