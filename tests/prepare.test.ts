import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { prepareAnalysis } from "../src/pipeline/prepareAnalysis.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

describe("prepare pipeline", () => {
  it("builds summary and insights with v2 schema", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {});

    expect(prepared.summary.sources.primary.sleep).toBe("Withings");
    expect(prepared.insights.metadata.schemaVersion).toBe("2.1.0");
    expect(prepared.insights.charts.map((chart) => chart.id)).toEqual([
      "sleep",
      "recovery",
      "activity",
      "bodyComposition",
    ]);
    expect(prepared.insights.historicalContext.scope.totalSpanDays).toBeGreaterThan(0);
    expect(prepared.insights.historicalContext.sleep.allTime.nights).toBeGreaterThan(0);
    expect(prepared.insights.narrativeContext.outputSchemaVersion).toBe("2.0.0");
    expect(prepared.insights.crossMetric).toBeDefined();
    expect(prepared.insights.crossMetric.compositeAssessment).toBeDefined();
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

    expect(summary.input.zipPath).toContain("multi-source-export/export.zip");
    expect(insights.metadata.schemaVersion).toBe("2.1.0");
    expect(insights.charts).toHaveLength(4);
    expect(insights.historicalContext.interpretationHints).toBeInstanceOf(Array);
  });
});
