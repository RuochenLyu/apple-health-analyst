import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { zhTranslations } from "../src/i18n/zh/index.js";
import { prepareAnalysis } from "../src/pipeline/prepareAnalysis.js";
import type { NarrativeReport } from "../src/types.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

function buildMinimalNarrative(chartIds: string[]): NarrativeReport {
  return {
    schema_version: "2.0.0",
    health_assessment: "测试健康评估。",
    cross_metric_insights: ["测试跨指标分析。"],
    behavioral_patterns: ["测试行为模式。"],
    overview: "测试概览。",
    key_findings: ["测试关键发现。"],
    strengths: ["测试优势。"],
    watchouts: ["测试注意事项。"],
    actions_next_2_weeks: ["测试建议。"],
    when_to_seek_care: ["测试就医建议。"],
    questions_for_doctor: ["测试就诊问题。"],
    data_limitations: ["测试数据局限。"],
    chart_callouts: chartIds.map((id) => ({
      chart_id: id,
      title: `${id} 图表`,
      summary: `${id} 测试摘要。`,
    })),
    disclaimer: "本报告仅供参考。",
  };
}

describe("render pipeline", () => {
  it("renders markdown and offline html from narrative json", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const chartIds = prepared.insights.charts.map((chart) => chart.id);
    const narrative = buildMinimalNarrative(chartIds);
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
    // External links should only be project-owned (GitHub repo, npm package)
    const httpsMatches = html.match(/https:\/\//g) ?? [];
    expect(httpsMatches.every((_, i) => {
      const urlMatch = html.match(/https:\/\/[^\s"<]*/g) ?? [];
      return urlMatch.every(u => u.includes("github.com/RuochenLyu") || u.includes("npmjs.com/package/apple-health"));
    })).toBe(true);
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
