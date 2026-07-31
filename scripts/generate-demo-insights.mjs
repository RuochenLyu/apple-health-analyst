import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoRoot = path.join(repoRoot, "examples", "demo");
const dayMs = 24 * 60 * 60 * 1000;
const start = new Date("2025-05-07T00:00:00.000Z");
const dayCount = 420;

function addDays(date, days) {
  return new Date(date.getTime() + days * dayMs);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function healthDate(date) {
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} +0000`;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function number(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function record(type, unit, value, startDate, endDate = startDate) {
  const unitAttribute = unit ? ` unit="${unit}"` : "";
  return `  <Record type="${type}" sourceName="Sample Watch"${unitAttribute} value="${value}" startDate="${healthDate(startDate)}" endDate="${healthDate(endDate)}"/>`;
}

function sleepRecord(value, startDate, endDate) {
  return record(
    "HKCategoryTypeIdentifierSleepAnalysis",
    "",
    value,
    startDate,
    endDate,
  );
}

function workout(type, startDate, duration, mets, heartRate, energy, distanceKm) {
  const endDate = addMinutes(startDate, duration);
  const statistics = [
    `    <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="${energy}" unit="kcal"/>`,
    `    <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="${heartRate}" minimum="${Math.max(55, heartRate - 28)}" maximum="${heartRate + 24}" unit="count/min"/>`,
    distanceKm === null
      ? ""
      : `    <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceWalkingRunning" sum="${distanceKm}" unit="km"/>`,
    `    <MetadataEntry key="HKAverageMETs" value="${mets}"/>`,
  ].filter(Boolean);
  return [
    `  <Workout workoutActivityType="${type}" duration="${duration}" durationUnit="min" sourceName="Sample Watch" startDate="${healthDate(startDate)}" endDate="${healthDate(endDate)}">`,
    ...statistics,
    "  </Workout>",
  ].join("\n");
}

function buildXml() {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<!DOCTYPE HealthData []>",
    '<HealthData locale="en_US">',
    '  <ExportDate value="2026-06-30 23:59:59 +0000"/>',
    '  <Me HKCharacteristicTypeIdentifierDateOfBirth=""/>',
  ];

  for (let index = 0; index < dayCount; index += 1) {
    const day = addDays(start, index);
    const weekendOffset = day.getUTCDay() === 5 || day.getUTCDay() === 6 ? 18 : 0;
    const bedtimeMinutes = 22 * 60 + 48 + weekendOffset + Math.round(Math.sin(index / 17) * 18);
    const sleepMinutes = 448 + Math.round(Math.sin(index / 23) * 22);
    const bedtime = addMinutes(day, bedtimeMinutes);
    const coreMinutes = Math.round(sleepMinutes * 0.53);
    const remMinutes = Math.round(sleepMinutes * 0.24);
    const deepMinutes = sleepMinutes - coreMinutes - remMinutes;
    const coreEnd = addMinutes(bedtime, coreMinutes);
    const remEnd = addMinutes(coreEnd, remMinutes);
    const deepEnd = addMinutes(remEnd, deepMinutes);
    const awakeEnd = addMinutes(deepEnd, 14 + (index % 4));
    lines.push(
      sleepRecord("HKCategoryValueSleepAnalysisAsleepCore", bedtime, coreEnd),
      sleepRecord("HKCategoryValueSleepAnalysisAsleepREM", coreEnd, remEnd),
      sleepRecord("HKCategoryValueSleepAnalysisAsleepDeep", remEnd, deepEnd),
      sleepRecord("HKCategoryValueSleepAnalysisAwake", deepEnd, awakeEnd),
    );

    const morning = addMinutes(day, 7 * 60 + 30);
    if (index % 2 === 0) {
      lines.push(
        record(
          "HKQuantityTypeIdentifierRestingHeartRate",
          "count/min",
          number(59 + Math.sin(index / 19) * 1.8),
          morning,
        ),
        record(
          "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
          "ms",
          number(44 + Math.cos(index / 21) * 4.2),
          addMinutes(morning, 5),
        ),
      );
    }
    if (index % 7 === 0) {
      lines.push(
        record(
          "HKQuantityTypeIdentifierOxygenSaturation",
          "%",
          number(96.4 + Math.sin(index / 13) * 0.5),
          addMinutes(morning, 10),
        ),
        record(
          "HKQuantityTypeIdentifierRespiratoryRate",
          "count/min",
          number(15.2 + Math.sin(index / 15) * 0.8),
          addMinutes(morning, 15),
        ),
      );
    }
    if (index % 28 === 0) {
      lines.push(
        record(
          "HKQuantityTypeIdentifierVO2Max",
          "mL/kg/min",
          number(42.3 + Math.sin(index / 50) * 1.1),
          addMinutes(morning, 20),
        ),
      );
    }
    if (index % 7 === 0) {
      lines.push(
        record(
          "HKQuantityTypeIdentifierBodyMass",
          "kg",
          number(72.8 - index * 0.0015 + Math.sin(index / 30) * 0.25),
          addMinutes(morning, -15),
        ),
        record(
          "HKQuantityTypeIdentifierBodyFatPercentage",
          "%",
          number(18.2 - index * 0.001 + Math.sin(index / 34) * 0.2),
          addMinutes(morning, -14),
        ),
      );
    }

    const exerciseMinutes = Math.round(24 + Math.sin(index / 11) * 7);
    const activeEnergy = Math.round(330 + Math.sin(index / 9) * 55);
    const standHours = 9 + (index % 4);
    lines.push(
      `  <ActivitySummary dateComponents="${dateOnly(day)}" activeEnergyBurned="${activeEnergy}" appleExerciseTime="${exerciseMinutes}" appleStandHours="${standHours}"/>`,
    );

    const weekday = day.getUTCDay();
    if (weekday === 2) {
      lines.push(
        workout(
          "HKWorkoutActivityTypeWalking",
          addMinutes(day, 7 * 60),
          42 + (index % 8),
          3.5,
          104 + (index % 5),
          205 + (index % 30),
          number(4.1 + (index % 5) * 0.1),
        ),
      );
    }
    if (weekday === 4) {
      lines.push(
        workout(
          "HKWorkoutActivityTypeTraditionalStrengthTraining",
          addMinutes(day, 18 * 60),
          48 + (index % 10),
          5,
          116 + (index % 6),
          265 + (index % 35),
          null,
        ),
      );
    }
    if (weekday === 6) {
      lines.push(
        workout(
          "HKWorkoutActivityTypeRunning",
          addMinutes(day, 8 * 60),
          36 + (index % 9),
          8.5,
          142 + (index % 7),
          385 + (index % 45),
          number(6.1 + (index % 6) * 0.12),
        ),
      );
    }
    if (index <= 370 && weekday === 0 && index % 14 < 7) {
      lines.push(
        workout(
          "HKWorkoutActivityTypeCycling",
          addMinutes(day, 9 * 60),
          58 + (index % 12),
          6.8,
          128 + (index % 6),
          410 + (index % 50),
          number(18 + (index % 8) * 0.4),
        ),
      );
    }
    if (index <= 378 && weekday === 5 && index % 14 < 7) {
      lines.push(
        workout(
          "HKWorkoutActivityTypeYoga",
          addMinutes(day, 18 * 60),
          38 + (index % 8),
          2.7,
          88 + (index % 5),
          125 + (index % 20),
          null,
        ),
      );
    }
  }

  lines.push("</HealthData>", "");
  return lines.join("\n");
}

async function run() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "apple-health-demo-"));
  try {
    const exportDir = path.join(tempRoot, "apple_health_export");
    await mkdir(exportDir, { recursive: true });
    await writeFile(path.join(exportDir, "export.xml"), buildXml(), "utf8");

    const zip = spawnSync("zip", ["-q", "-r", "export.zip", "apple_health_export"], {
      cwd: tempRoot,
      encoding: "utf8",
    });
    if (zip.status !== 0) {
      throw new Error(zip.stderr || "Unable to create the synthetic demo ZIP.");
    }

    for (const language of ["en", "zh"]) {
      const outDir = path.join(demoRoot, language);
      await mkdir(outDir, { recursive: true });
      const prepare = spawnSync(
        "npm",
        [
          "run",
          "dev",
          "--",
          "prepare",
          path.join(tempRoot, "export.zip"),
          "--lang",
          language,
          "--out",
          outDir,
        ],
        { cwd: repoRoot, encoding: "utf8", stdio: "inherit" },
      );
      if (prepare.status !== 0) {
        throw new Error(`Unable to prepare ${language} synthetic demo insights.`);
      }

      for (const filename of ["summary.json", "insights.json"]) {
        const outputPath = path.join(outDir, filename);
        const output = JSON.parse(await readFile(outputPath, "utf8"));
        output.metadata.generatedAt = "2026-06-30T23:59:59.000Z";
        await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
      }
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

await run();
