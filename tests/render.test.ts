import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { enTranslations } from "../src/i18n/en/index.js";
import { zhTranslations } from "../src/i18n/zh/index.js";
import { prepareAnalysis } from "../src/pipeline/prepareAnalysis.js";
import { renderReportHtml } from "../src/render/reportHtml.js";
import { renderReportMarkdown } from "../src/render/reportMarkdown.js";
import { renderTrainingReportHtml } from "../src/render/trainingReportHtml.js";
import type { NarrativeReport, TrainingNarrativeReport } from "../src/types.js";

function fixturePath(name: string): string {
  return new URL(`../fixtures/${name}/export.zip`, import.meta.url).pathname;
}

function expectBalancedHtmlTags(html: string): void {
  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  const stack: string[] = [];
  const tagPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-z][\w:-]*)\b[^>]*>/gi;

  for (const match of html.matchAll(tagPattern)) {
    const token = match[0];
    const tag = match[1]?.toLowerCase();
    if (!tag || token.startsWith("<!") || token.endsWith("/>") || voidTags.has(tag)) {
      continue;
    }
    if (token.startsWith("</")) {
      expect(stack.pop(), `Unexpected closing tag ${tag}`).toBe(tag);
    } else {
      stack.push(tag);
    }
  }
  expect(stack).toEqual([]);
}

function buildMinimalNarrative(chartIds: string[]): NarrativeReport {
  return {
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
    chart_callouts: chartIds.map((id) => ({
      chart_id: id,
      title: `${id} 图表`,
      summary: `${id} 测试摘要。`,
    })),
    disclaimer: "本报告仅供参考。",
  };
}

function buildMinimalTrainingNarrative(
  chartIds: string[],
  sportIds: string[],
): TrainingNarrativeReport {
  return {
    schema_version: "2.0.0",
    training_assessment: "测试训练评估。",
    overall_findings: ["测试训练发现。"],
    sport_sections: sportIds.map((sportId) => ({
      sport_id: sportId,
      title: `${sportId} 专项`,
      assessment: `${sportId} 测试专项判断。`,
      key_signals: [`${sportId} 测试信号。`],
      recommendations: [`${sportId} 测试建议。`],
    })),
    watchouts: ["测试训练注意事项。"],
    actions_next_2_weeks: ["测试训练建议。"],
    questions_for_doctor: ["测试训练就诊问题。"],
    data_limitations: ["测试训练数据局限。"],
    chart_callouts: chartIds.map((id) => ({
      chart_id: id,
      title: `${id} 图表`,
      summary: `${id} 训练摘要。`,
    })),
    disclaimer: "训练报告仅供参考。",
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
    expect(markdown).toContain("## 近期数据小结");
    expect(markdown).not.toContain("综合评分");
    expect(markdown).toContain("## 关键发现");
    expect(markdown).toContain("## 长期历史参照");
    expect(narrativeJson.schema_version).toBe("3.0.0");
    expect(narrativeJson.health_assessment).toBeDefined();
    expect(narrativeJson.cross_metric_insights).toBeDefined();
    expectBalancedHtmlTags(html);
  });

  it("omits empty health markdown sections", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const insights = structuredClone(prepared.insights);
    insights.riskFlags = [];
    insights.notableChanges = [];
    const narrative: NarrativeReport = {
      ...buildMinimalNarrative(insights.charts.map((chart) => chart.id)),
      cross_metric_insights: [],
      behavioral_patterns: [],
      strengths: [],
      watchouts: [],
      actions_next_2_weeks: [],
      when_to_seek_care: [],
      questions_for_doctor: [],
      data_limitations: [],
    };

    const markdown = renderReportMarkdown(insights, narrative, zhTranslations.render);

    for (const title of [
      zhTranslations.render.mdCrossMetricTitle,
      zhTranslations.render.mdBehavioralPatterns,
      zhTranslations.render.mdStrengths,
      zhTranslations.render.mdWatchouts,
      zhTranslations.render.mdActionsNext2Weeks,
      zhTranslations.render.mdSeekCare,
      zhTranslations.render.mdDoctorQuestions,
      zhTranslations.render.mdDataLimitations,
      zhTranslations.render.mdRiskSignalsTitle,
    ]) {
      expect(markdown).not.toContain(`## ${title}`);
    }
    expect(markdown).toContain(`## ${zhTranslations.render.mdKeyFindings}`);
  });

  it("renders training markdown and offline html without overwriting health report names", async () => {
    const prepared = await prepareAnalysis(fixturePath("multi-source-export"), {}, zhTranslations);
    const chartIds = prepared.insights.training.charts.map((chart) => chart.id);
    const sportIds = prepared.insights.training.sports.map((sport) => sport.id);
    const narrative = buildMinimalTrainingNarrative(chartIds, sportIds);
    const inputDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-training-input-"));
    const outDir = await mkdtemp(path.join(os.tmpdir(), "apple-health-training-output-"));
    const insightsPath = path.join(inputDir, "insights.json");
    const narrativePath = path.join(inputDir, "training.report.llm.json");

    await writeFile(insightsPath, JSON.stringify(prepared.insights, null, 2));
    await writeFile(narrativePath, JSON.stringify(narrative, null, 2));

    await runCli([
      "render",
      "--type",
      "training",
      "--insights",
      insightsPath,
      "--narrative",
      narrativePath,
      "--out",
      outDir,
    ]);

    const html = await readFile(path.join(outDir, "training.report.html"), "utf8");
    const markdown = await readFile(path.join(outDir, "training.report.md"), "utf8");
    const narrativeJson = JSON.parse(await readFile(path.join(outDir, "training.report.llm.json"), "utf8"));

    expect(html).toContain("Apple Health 运动报告");
    expect(html).toContain('href="#load-recovery"');
    expect(markdown).toContain("# Apple Health 运动报告");
    expect(markdown).toContain("## 训练评估");
    expect(narrativeJson.schema_version).toBe("2.0.0");
    expect(narrativeJson.training_assessment).toBeDefined();

    // Regression: the Chinese training report must localize chart aria labels
    // and tooltip unit suffixes instead of leaking English "Trend chart" / "min" / "index".
    expect(html).toMatch(/aria-label="[^"]+: 趋势图"/);
    expect(html).not.toContain("Trend chart");
    // Every SVG tooltip that has a unit should use the localized unit tokens.
    const tooltipMatches = html.match(/<title>[^<]+<\/title>/g) ?? [];
    for (const match of tooltipMatches) {
      expect(match).not.toMatch(/: [-\d.]+ min</);
      expect(match).not.toMatch(/: [-\d.]+ index</);
    }

    // Regression: training report adopts the shared module skeleton
    // (numbered header, colored left border, semantic badges, hero card).
    expect(html).toContain("assessment-hero__main");
    expect(html).toContain('class="module__index">01<');
    expect(html).toContain('class="module__index">02<');
    expect(html).toContain("module--recovery-support");
    expect(html).toContain("module--activity sport-module");
    expect(html).toMatch(/class="badge badge--(ok|warn|low|info)"/);
    // Status pills must no longer fall back to the monochrome pill--info style.
    expect(html).not.toContain('class="pill pill--info"');

    // Regression: hero must surface ATL/CTL/TSB driven stats and the load
    // chart must carry the new CTL/ATL series, even when the fixture is too
    // sparse to classify a training state.
    expect(html).toContain("42 日负荷基线 (CTL)");
    expect(html).toContain("负荷差 (TSB)");
    expect(prepared.insights.training.charts[0].id).toBe("training_load");
    const loadSeriesIds = prepared.insights.training.charts[0].series.map(
      (series) => series.id,
    );
    expect(loadSeriesIds).toEqual([
      "training_load_ctl",
      "training_load_atl",
      "training_load_tsb",
    ]);

    // Regression: P3 visual upgrades — term hints, glossary card, PMC chart,
    // dual-axis sport trend chart, and calendar heatmap card.
    expect(html).toContain("term-hint");
    expect(html).toContain("glossary-card");
    expect(html).toContain(zhTranslations.trainingRender.glossaryTitle);
    // Sport trend chart should be dual-axis now (bar + line), not dual index lines.
    const sportChart = prepared.insights.training.charts.find((c) =>
      c.id.startsWith("sport_"),
    );
    if (sportChart) {
      expect(sportChart.series.map((s) => s.visual)).toEqual(["bar", "line"]);
    }
    // PMC chart: third series is the TSB area.
    expect(prepared.insights.training.charts[0].series[2].visual).toBe("area");
    // Daily load payload exposed for the heatmap.
    expect(Array.isArray(prepared.insights.training.dailyLoad)).toBe(true);
    // The calendar starts each column on Monday, so weekday labels belong to
    // rows 0/2/4 rather than the following Tuesday/Thursday/Saturday rows.
    expect(html).toContain('x="0" y="30" font-size="12" fill="#64748B">周一</text>');
    expect(html).toContain('x="0" y="68" font-size="12" fill="#64748B">周三</text>');
    expect(html).toContain('x="0" y="106" font-size="12" fill="#64748B">周五</text>');
    expect(html).toMatch(/<desc>日历显示 [^<]+累计训练负荷 [^<]+<\/desc>/);
    expect(html).toContain('role="img" tabindex="0"');
    // Print output keeps standalone report cards together and reveals closed
    // details content in browsers that implement the details-content wrapper.
    expect(html).toContain(".module-card,");
    expect(html).toContain(".heatmap-card,");
    expect(html).toContain(".body-card,");
    expect(html).toContain(".glossary-card {");
    expect(html).toContain("details::details-content");
    expect(html).toContain("content-visibility: visible");
    expectBalancedHtmlTags(html);
  });

  it("renders synthetic notices, semantic recovery tables, and dormant sports accessibly", async () => {
    const prepared = await prepareAnalysis(
      fixturePath("multi-source-export"),
      { locale: "en" },
      enTranslations,
    );
    const healthNarrative = buildMinimalNarrative(
      prepared.insights.charts.map((chart) => chart.id),
    );
    const healthHtml = renderReportHtml(
      prepared.insights,
      healthNarrative,
      enTranslations.render,
      { sampleNotice: "Synthetic fixture" },
    );

    expect(healthHtml).toContain(
      '<aside class="sample-notice" role="note">Synthetic fixture</aside>',
    );
    expect(healthHtml).toContain("<caption");
    expect(healthHtml).toContain('<th scope="row"');
    expect(healthHtml).not.toContain("ledger__spark");

    const dormantInsights = structuredClone(prepared.insights);
    const sport = dormantInsights.training.sports[0]!;
    sport.recent30d.workouts = 0;
    const trainingNarrative = buildMinimalTrainingNarrative(
      dormantInsights.training.charts.map((chart) => chart.id),
      dormantInsights.training.sports.map((entry) => entry.id),
    );
    trainingNarrative.sport_sections[0]!.recommendations = [];
    const trainingHtml = renderTrainingReportHtml(
      dormantInsights,
      trainingNarrative,
      enTranslations.trainingRender,
      { sampleNotice: "Synthetic fixture" },
    );

    expect(trainingHtml).toContain(
      '<aside class="sample-notice" role="note">Synthetic fixture</aside>',
    );
    expect(trainingHtml).toContain(
      'class="module module--activity sport-module sport-disclosure"',
    );
    expect(trainingHtml).toContain("<details");
    expect(trainingHtml).toContain(
      `${enTranslations.trainingRender.nextDaySleepDeltaLabel} (next day n=`,
    );
    expect(trainingHtml).not.toContain(
      `${enTranslations.trainingRender.nextDaySleepDeltaLabel}（`,
    );
    expect(healthHtml).toMatch(/<svg[^>]*role="img"[^>]*tabindex="0"[^>]*>/);
    expect(trainingHtml).toMatch(/<svg[^>]*role="img"[^>]*tabindex="0"[^>]*>/);
    expect(healthHtml).toMatch(/<desc>[^<]+data points?;[^<]+range [^<]+<\/desc>/);
    expect(trainingHtml).toMatch(/<desc>[^<]+data points?;[^<]+range [^<]+<\/desc>/);
    expect(trainingHtml).toMatch(/<desc>The calendar shows [^<]+<\/desc>/);
    expect(healthHtml).not.toMatch(/<(?:circle|rect)[^>]*tabindex=/);
    expect(trainingHtml).not.toMatch(/<(?:circle|rect)[^>]*tabindex=/);
    expectBalancedHtmlTags(healthHtml);
    expectBalancedHtmlTags(trainingHtml);
  });
});
