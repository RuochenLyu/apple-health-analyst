import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { createFallbackNarrative } from "../src/narrative/createFallbackNarrative.js";
import { prepareAnalysis } from "../src/pipeline/prepareAnalysis.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

describe("render pipeline", () => {
  it("renders markdown and offline html from narrative json", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {});
    const narrative = createFallbackNarrative(prepared.insights);
    const inputDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-input-"));
    const outDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-output-"));
    const insightsPath = path.join(inputDir, "insights.json");
    const narrativePath = path.join(inputDir, "report.llm.json");

    await writeFile(insightsPath, JSON.stringify(prepared.insights, null, 2));
    await writeFile(narrativePath, JSON.stringify(narrative, null, 2));

    await runCli([
      "render",
      "--insights",
      insightsPath,
      "--narrative",
      narrativePath,
      "--out",
      outDir,
    ]);

    const html = await readFile(path.join(outDir, "report.html"), "utf8");
    const markdown = await readFile(path.join(outDir, "report.md"), "utf8");
    const narrativeJson = JSON.parse(await readFile(path.join(outDir, "report.llm.json"), "utf8"));

    expect(html).toContain("<svg");
    expect(html).not.toContain("https://");
    expect(html).toContain('id="sleep"');
    expect(html).toContain('id="recovery"');
    expect(html).toContain("关键发现");
    expect(markdown).toContain("## 综合健康评估");
    expect(markdown).toContain("## 关键发现");
    expect(markdown).toContain("## 长期历史参照");
    expect(narrativeJson.schema_version).toBe("2.0.0");
    expect(narrativeJson.health_assessment).toBeDefined();
    expect(narrativeJson.cross_metric_insights).toBeDefined();
  });
});
