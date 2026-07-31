#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import { getTranslations, type Locale } from "./i18n/index.js";
import { validateNarrativeReport } from "./narrative/validateNarrativeReport.js";
import { validateTrainingNarrativeReport } from "./narrative/validateTrainingNarrativeReport.js";
import { prepareAnalysis } from "./pipeline/prepareAnalysis.js";
import {
  writePrepareOutputs,
  writeRenderedOutputs,
} from "./pipeline/writeOutputs.js";
import {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  type InsightBundle,
  type NarrativeReport,
  type ReportType,
  type TrainingNarrativeReport,
} from "./types.js";

async function readJsonFile(filePath: string): Promise<unknown> {
  const contents = await readFile(path.resolve(filePath), "utf8");
  return JSON.parse(contents);
}

function asInsightBundle(value: unknown, reportType: ReportType): InsightBundle {
  if (!value || typeof value !== "object") {
    throw new Error("insights.json must be an object.");
  }

  const candidate = value as Partial<InsightBundle>;
  if (
    !candidate.metadata ||
    typeof candidate.metadata.schemaVersion !== "string" ||
    !["zh-CN", "en-US", "zh", "en"].includes(candidate.metadata.language)
  ) {
    throw new Error("insights.json metadata is missing or unsupported.");
  }
  if (!Array.isArray(candidate.charts)) {
    throw new Error("insights.json is missing the charts array.");
  }
  if (!candidate.analysis || !candidate.coverage || !candidate.input) {
    throw new Error("insights.json structure is incomplete.");
  }
  // The training section is only required when rendering a training report.
  // Older health-only insights.json files (pre-2.3 schema) remain compatible
  // with `render --type health` as long as their health structure is intact.
  if (reportType === "training") {
    if (
      !candidate.training ||
      !Array.isArray(candidate.training.charts) ||
      !Array.isArray(candidate.training.sports)
    ) {
      throw new Error(
        "insights.json is missing the training section. Re-run `prepare` with the current version to regenerate it.",
      );
    }
  }

  return candidate as InsightBundle;
}

function asLocale(value: string): Locale {
  if (value === "zh" || value === "en") {
    return value;
  }
  throw new Error(`Unsupported language: ${value}. Expected zh or en.`);
}

function asTopSportCount(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^[1-8]$/.test(value)) {
    throw new Error(`--top-sports must be an integer from 1 to 8; got ${value}.`);
  }
  return Number(value);
}

function asReportType(value: string | undefined): ReportType {
  if (!value || value === "health") {
    return "health";
  }
  if (value === "training") {
    return "training";
  }
  throw new Error(`Unsupported render type: ${value}. Expected health or training.`);
}

async function runPrepare(
  exportZip: string,
  options: {
    from?: string;
    to?: string;
    out: string;
    lang: string;
    topSports?: string;
  },
) {
  const locale = asLocale(options.lang);
  const t = await getTranslations(locale);
  const outputDir = path.resolve(options.out);
  const topSportCount = asTopSportCount(options.topSports);
  const prepared = await prepareAnalysis(
    exportZip,
    { ...options, locale, topSportCount },
    t,
  );
  await writePrepareOutputs(prepared.summary, prepared.insights, outputDir);
  return prepared;
}

async function runRender(
  options: {
    insights: string;
    narrative: string;
    out: string;
    type?: string;
    withCrossLink?: boolean;
  },
) {
  const outputDir = path.resolve(options.out);
  const reportType = asReportType(options.type);
  const insights = asInsightBundle(await readJsonFile(options.insights), reportType);
  const locale: Locale = insights.metadata.language === "zh" || insights.metadata.language === "zh-CN" ? "zh" : "en";
  const t = await getTranslations(locale);
  const narrativePayload = await readJsonFile(options.narrative);
  let narrative: NarrativeReport | TrainingNarrativeReport;

  if (reportType === "training") {
    narrative = validateTrainingNarrativeReport(
      narrativePayload,
      insights.training.charts.map((chart) => chart.id),
      insights.training.sports.map((sport) => sport.id),
    );
  } else {
    narrative = validateNarrativeReport(
      narrativePayload,
      insights.charts.map((chart) => chart.id),
    );
  }

  await writeRenderedOutputs(reportType, insights, narrative, outputDir, t, {
    includeCrossLink: options.withCrossLink === true,
  });
  return { insights, narrative };
}

export async function runCli(argv: string[]) {
  const program = new Command();
  program
    .name(PACKAGE_NAME)
    .description("Analyze Apple Health export ZIP files.")
    .version(PACKAGE_VERSION)
    .showHelpAfterError();

  program
    .command("prepare")
    .argument("<exportZip>", "Apple Health export ZIP path")
    .option("--from <date>", "Only analyze data on or after YYYY-MM-DD")
    .option("--to <date>", "Only analyze data on or before YYYY-MM-DD")
    .option("--out <dir>", "Output directory", "./output")
    .option("--lang <locale>", "Report language (zh|en)", "en")
    .option(
      "--top-sports <n>",
      "Maximum number of primary sports to surface in the training report (default 5)",
    )
    .action(async (exportZip, options) => {
      await runPrepare(exportZip, options);
    });

  program
    .command("render")
    .requiredOption("--insights <file>", "Path to insights.json from prepare")
    .requiredOption("--narrative <file>", "Path to narrative json from LLM")
    .option("--type <health|training>", "Render report type", "health")
    .option("--out <dir>", "Output directory", "./output")
    .option(
      "--with-cross-link",
      "Emit the topbar/footer link to the companion report. Set this only when the other report will be rendered into the same --out directory; omitting it prevents a dead link on single-report runs.",
    )
    .action(async (options) => {
      await runRender(options);
    });

  await program.parseAsync(argv, { from: "user" });
}

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
const entry = realpathSync(process.argv[1]);
if (self === entry) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
