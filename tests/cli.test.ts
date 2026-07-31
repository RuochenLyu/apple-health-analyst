import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { zhTranslations } from "../src/i18n/zh/index.js";
import { prepareAnalysis } from "../src/pipeline/prepareAnalysis.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

describe("cli", () => {
  it("prepare writes summary.json and insights.json", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-analyst-"));

    await runCli([
      "prepare",
      fixturePath("multi-source-export"),
      "--out",
      outDir,
    ]);

    const files = await readdir(outDir);
    expect(files).toContain("summary.json");
    expect(files).toContain("insights.json");
  });

  it("prepare applies --from and --to filters", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-analyst-"));

    await runCli([
      "prepare",
      fixturePath("multi-source-export"),
      "--from",
      "2026-03-01",
      "--to",
      "2026-03-26",
      "--out",
      outDir,
    ]);

    const summary = JSON.parse(await readFile(path.join(outDir, "summary.json"), "utf8"));
    expect(summary.input.from).toBe("2026-03-01");
    expect(summary.input.to).toBe("2026-03-26");
  });

  it("rejects unsupported locale and malformed sport limits", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-analyst-"));

    await expect(
      runCli([
        "prepare",
        fixturePath("minimal-export"),
        "--lang",
        "fr",
        "--out",
        outDir,
      ]),
    ).rejects.toThrow(/Expected zh or en/);

    await expect(
      runCli([
        "prepare",
        fixturePath("minimal-export"),
        "--top-sports",
        "2abc",
        "--out",
        outDir,
      ]),
    ).rejects.toThrow(/integer from 1 to 8/);
  });

  it("renders health and training reports into the same output directory", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const outDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-analyst-render-"));
    const inputDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-analyst-input-"));
    const insightsPath = path.join(inputDir, "insights.json");
    const healthNarrativePath = path.join(inputDir, "report.llm.json");
    const trainingNarrativePath = path.join(inputDir, "training.report.llm.json");

    await writeFile(insightsPath, JSON.stringify(prepared.insights, null, 2));
    await writeFile(
      healthNarrativePath,
      JSON.stringify({
        schema_version: "3.0.0",
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
        chart_callouts: prepared.insights.charts.map((chart) => ({
          chart_id: chart.id,
          title: chart.title,
          summary: `${chart.id} 测试摘要。`,
        })),
        disclaimer: "本报告仅供参考。",
      }, null, 2),
    );
    await writeFile(
      trainingNarrativePath,
      JSON.stringify({
        schema_version: "2.0.0",
        training_assessment: "测试训练评估。",
        overall_findings: ["测试训练发现。"],
        sport_sections: prepared.insights.training.sports.map((sport) => ({
          sport_id: sport.id,
          title: `${sport.label} 专项`,
          assessment: `${sport.label} 测试专项判断。`,
          key_signals: [`${sport.label} 测试信号。`],
          recommendations: [`${sport.label} 测试建议。`],
        })),
        watchouts: ["测试训练注意事项。"],
        actions_next_2_weeks: ["测试训练建议。"],
        questions_for_doctor: ["测试训练就诊问题。"],
        data_limitations: ["测试训练数据局限。"],
        chart_callouts: prepared.insights.training.charts.map((chart) => ({
          chart_id: chart.id,
          title: chart.title,
          summary: `${chart.id} 测试摘要。`,
        })),
        disclaimer: "训练报告仅供参考。",
      }, null, 2),
    );

    await runCli([
      "render",
      "--insights",
      insightsPath,
      "--narrative",
      healthNarrativePath,
      "--out",
      outDir,
    ]);
    await runCli([
      "render",
      "--type",
      "training",
      "--insights",
      insightsPath,
      "--narrative",
      trainingNarrativePath,
      "--out",
      outDir,
    ]);

    const files = await readdir(outDir);
    expect(files).toEqual(expect.arrayContaining([
      "report.html",
      "report.llm.json",
      "report.md",
      "training.report.html",
      "training.report.llm.json",
      "training.report.md",
    ]));
  });

  it("renders a health report from legacy insights.json that has no training section", async () => {
    // Regression for the render-side validator: old health-only insights
    // files (pre-2.3 schema) must still render with `--type health` even
    // though they are missing `training.*`.
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const legacyInsights = JSON.parse(JSON.stringify(prepared.insights));
    delete legacyInsights.training;

    const inputDir = await mkdtemp(path.join(os.tmpdir(), "apha-legacy-"));
    const outDir = await mkdtemp(path.join(os.tmpdir(), "apha-legacy-out-"));
    const insightsPath = path.join(inputDir, "insights.json");
    const narrativePath = path.join(inputDir, "report.llm.json");

    await writeFile(insightsPath, JSON.stringify(legacyInsights, null, 2));
    await writeFile(
      narrativePath,
      JSON.stringify({
        schema_version: "3.0.0",
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
        chart_callouts: legacyInsights.charts.map((chart: { id: string; title: string }) => ({
          chart_id: chart.id,
          title: chart.title,
          summary: `${chart.id} 测试摘要。`,
        })),
        disclaimer: "本报告仅供参考。",
      }, null, 2),
    );

    await runCli([
      "render",
      "--insights",
      insightsPath,
      "--narrative",
      narrativePath,
      "--out",
      outDir,
    ]);
    const files = await readdir(outDir);
    expect(files).toEqual(expect.arrayContaining(["report.html", "report.md", "report.llm.json"]));

    // Conversely, requesting a training render from the same legacy insights
    // should now produce a clear error instead of a silent partial render.
    await expect(
      runCli([
        "render",
        "--type",
        "training",
        "--insights",
        insightsPath,
        "--narrative",
        narrativePath,
        "--out",
        outDir,
      ]),
    ).rejects.toThrow(/training section/);
  });
});
