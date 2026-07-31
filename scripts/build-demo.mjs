import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { enTranslations } from "../dist/i18n/en/index.js";
import { zhTranslations } from "../dist/i18n/zh/index.js";
import { validateNarrativeReport } from "../dist/narrative/validateNarrativeReport.js";
import { validateTrainingNarrativeReport } from "../dist/narrative/validateTrainingNarrativeReport.js";
import { renderReportHtml } from "../dist/render/reportHtml.js";
import { renderTrainingReportHtml } from "../dist/render/trainingReportHtml.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoRoot = path.join(repoRoot, "examples", "demo");
const docsRoot = path.join(repoRoot, "docs");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizeHtml(html) {
  return `${html.replace(/[ \t]+$/gm, "").trimEnd()}\n`;
}

async function buildLanguage(language, translations) {
  const sourceDir = path.join(demoRoot, language);
  const outputDir = language === "en" ? docsRoot : path.join(docsRoot, "zh");
  const insights = await readJson(path.join(sourceDir, "insights.json"));
  const healthNarrative = validateNarrativeReport(
    await readJson(path.join(sourceDir, "report.llm.json")),
    insights.charts.map((chart) => chart.id),
  );
  const trainingNarrative = validateTrainingNarrativeReport(
    await readJson(path.join(sourceDir, "training.report.llm.json")),
    insights.training.charts.map((chart) => chart.id),
    insights.training.sports.map((sport) => sport.id),
  );
  const sampleNotice =
    language === "zh"
      ? "公开演示 · 本页全部数据均为程序生成的合成样本，不对应任何真实个人。"
      : "Public demo · Every value on this page is programmatically generated synthetic data and does not represent a real person.";

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(outputDir, "report.html"),
      normalizeHtml(
        renderReportHtml(insights, healthNarrative, translations.render, {
          includeCrossLink: true,
          sampleNotice,
        }),
      ),
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "training.report.html"),
      normalizeHtml(
        renderTrainingReportHtml(
          insights,
          trainingNarrative,
          translations.trainingRender,
          {
            includeCrossLink: true,
            sampleNotice,
          },
        ),
      ),
      "utf8",
    ),
  ]);
}

await Promise.all([
  buildLanguage("en", enTranslations),
  buildLanguage("zh", zhTranslations),
]);
