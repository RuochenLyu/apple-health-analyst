import { StringDecoder } from "node:string_decoder";
import { SaxesParser } from "saxes";

import type {
  ActivitySummarySample,
  AttachmentSummary,
  ContraceptiveSample,
  IntermenstrualBleedingSample,
  MenstrualFlowSample,
  MetricKey,
  ParsedHealthExport,
  QuantitySample,
  SleepSample,
  SourceSummary,
  WorkoutSample,
} from "../types.js";

import { canonicalizeSourceName, chooseDisplayName } from "../normalize/canonicalizeSource.js";

interface ZipEntryLike {
  path: string;
  type?: string;
  stream: () => NodeJS.ReadableStream;
}

type HandlerName = "HealthData" | "ExportDate" | "Record" | "Workout" | "ActivitySummary";

type CategoryMetric = "menstrualFlow" | "intermenstrualBleeding" | "contraceptive";

const CATEGORY_RECORD_MAP: Record<string, CategoryMetric | undefined> = {
  HKCategoryTypeIdentifierMenstrualFlow: "menstrualFlow",
  HKCategoryTypeIdentifierIntermenstrualBleeding: "intermenstrualBleeding",
  HKCategoryTypeIdentifierContraceptive: "contraceptive",
};

const RECORD_TYPE_MAP: Record<string, Exclude<MetricKey, "sleep"> | "sleep" | undefined> = {
  HKCategoryTypeIdentifierSleepAnalysis: "sleep",
  HKQuantityTypeIdentifierRestingHeartRate: "restingHeartRate",
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv",
  HKQuantityTypeIdentifierOxygenSaturation: "oxygenSaturation",
  HKQuantityTypeIdentifierRespiratoryRate: "respiratoryRate",
  HKQuantityTypeIdentifierVO2Max: "vo2Max",
  HKQuantityTypeIdentifierBodyMass: "bodyMass",
  HKQuantityTypeIdentifierBodyFatPercentage: "bodyFatPercentage",
};

function normalizePercent(metric: Exclude<MetricKey, "sleep">, value: number): number {
  if ((metric === "oxygenSaturation" || metric === "bodyFatPercentage") && value <= 1) {
    return value * 100;
  }
  return value;
}

function parseNumeric(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function plainAttributes(rawAttributes: Record<string, unknown>): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawAttributes)) {
    if (typeof value === "string") {
      attributes[key] = value;
      continue;
    }
    if (value && typeof value === "object" && "value" in value) {
      attributes[key] = String((value as { value: unknown }).value);
    }
  }
  return attributes;
}

function summarizeAttachments(entries: ZipEntryLike[], mainXmlEntry: string): AttachmentSummary {
  const exampleFiles: string[] = [];
  let ecgFiles = 0;
  let workoutRouteFiles = 0;
  let imageAttachments = 0;
  let otherFiles = 0;

  for (const entry of entries) {
    if (entry.type === "Directory") {
      continue;
    }

    const lowerPath = entry.path.toLowerCase();
    if (entry.path === mainXmlEntry || lowerPath.endsWith("export_cda.xml")) {
      continue;
    }

    if (lowerPath.includes("/electrocardiograms/")) {
      ecgFiles += 1;
    } else if (lowerPath.includes("/workout-routes/")) {
      workoutRouteFiles += 1;
    } else if (/\.(png|jpg|jpeg|heic)$/i.test(entry.path)) {
      imageAttachments += 1;
    } else {
      otherFiles += 1;
    }

    if (exampleFiles.length < 5) {
      exampleFiles.push(entry.path);
    }
  }

  return {
    ecgFiles,
    workoutRouteFiles,
    imageAttachments,
    otherFiles,
    exampleFiles,
  };
}

export async function parseHealthExport(
  zipPath: string,
  entries: ZipEntryLike[],
  mainXmlEntry: ZipEntryLike,
): Promise<ParsedHealthExport> {
  const sourceBuckets = new Map<
    string,
    {
      rawNames: Map<string, number>;
      recordCount: number;
      workoutCount: number;
      metricCounts: Partial<Record<MetricKey, number>>;
    }
  >();

  const parsed: ParsedHealthExport = {
    inputPath: zipPath,
    mainXmlEntry: mainXmlEntry.path,
    locale: null,
    exportDate: null,
    coverageStart: null,
    coverageEnd: null,
    recordCount: 0,
    workoutCount: 0,
    activitySummaryCount: 0,
    sources: [],
    records: {
      sleep: [],
      restingHeartRate: [],
      hrv: [],
      oxygenSaturation: [],
      respiratoryRate: [],
      vo2Max: [],
      bodyMass: [],
      bodyFatPercentage: [],
    },
    workouts: [],
    activitySummaries: [],
    menstrualFlow: [],
    intermenstrualBleeding: [],
    contraceptive: [],
    attachments: summarizeAttachments(entries, mainXmlEntry.path),
  };

  const registerSource = (sourceName: string, kind: "record" | "workout", metric?: MetricKey) => {
    const canonicalName = canonicalizeSourceName(sourceName);
    const bucket =
      sourceBuckets.get(canonicalName) ??
      {
        rawNames: new Map<string, number>(),
        recordCount: 0,
        workoutCount: 0,
        metricCounts: {},
      };

    bucket.rawNames.set(sourceName, (bucket.rawNames.get(sourceName) ?? 0) + 1);
    if (kind === "record") {
      bucket.recordCount += 1;
    } else {
      bucket.workoutCount += 1;
    }
    if (metric) {
      bucket.metricCounts[metric] = (bucket.metricCounts[metric] ?? 0) + 1;
    }
    sourceBuckets.set(canonicalName, bucket);
  };

  const updateCoverage = (candidate: Date | null) => {
    if (!candidate) {
      return;
    }
    if (!parsed.coverageStart || candidate < parsed.coverageStart) {
      parsed.coverageStart = candidate;
    }
    if (!parsed.coverageEnd || candidate > parsed.coverageEnd) {
      parsed.coverageEnd = candidate;
    }
  };

  const handlers: Partial<Record<HandlerName, (attributes: Record<string, string>) => void>> = {
    HealthData: (attributes) => {
      parsed.locale = attributes.locale ?? null;
    },
    ExportDate: (attributes) => {
      parsed.exportDate = attributes.value ? new Date(attributes.value) : null;
      updateCoverage(parsed.exportDate);
    },
    Record: (attributes) => {
      parsed.recordCount += 1;

      const sourceName = attributes.sourceName;
      const recordType = attributes.type;
      const metric = recordType ? RECORD_TYPE_MAP[recordType] : undefined;
      const startDate = attributes.startDate ? new Date(attributes.startDate) : null;
      const endDate = attributes.endDate ? new Date(attributes.endDate) : startDate;

      updateCoverage(startDate);
      updateCoverage(endDate);

      if (sourceName) {
        registerSource(sourceName, "record", metric);
      }

      const categoryMetric = recordType ? CATEGORY_RECORD_MAP[recordType] : undefined;
      if (categoryMetric && sourceName && startDate && endDate) {
        const canonicalSource = canonicalizeSourceName(sourceName);
        const sample = {
          metric: categoryMetric,
          sourceName,
          canonicalSource,
          startDate,
          endDate,
          value: attributes.value ?? "",
        } as MenstrualFlowSample | IntermenstrualBleedingSample | ContraceptiveSample;
        parsed[categoryMetric].push(sample as never);
        return;
      }

      if (!metric || !sourceName || !startDate || !endDate) {
        return;
      }

      const canonicalSource = canonicalizeSourceName(sourceName);
      if (metric === "sleep") {
        const sleepSample: SleepSample = {
          metric,
          sourceName,
          canonicalSource,
          startDate,
          endDate,
          value: attributes.value ?? "",
        };
        parsed.records.sleep.push(sleepSample);
        return;
      }

      const value = normalizePercent(metric, parseNumeric(attributes.value) ?? Number.NaN);
      if (!Number.isFinite(value)) {
        return;
      }

      const quantitySample: QuantitySample = {
        metric,
        sourceName,
        canonicalSource,
        startDate,
        endDate,
        unit: attributes.unit,
        value,
      };
      parsed.records[metric].push(quantitySample);
    },
    Workout: (attributes) => {
      parsed.workoutCount += 1;
      const sourceName = attributes.sourceName ?? "未知来源";
      const startDate = attributes.startDate ? new Date(attributes.startDate) : null;
      const endDate = attributes.endDate ? new Date(attributes.endDate) : startDate;

      updateCoverage(startDate);
      updateCoverage(endDate);

      registerSource(sourceName, "workout");

      if (!startDate || !endDate) {
        return;
      }

      const workout: WorkoutSample = {
        sourceName,
        canonicalSource: canonicalizeSourceName(sourceName),
        workoutActivityType: attributes.workoutActivityType ?? "HKWorkoutActivityTypeOther",
        durationMinutes: parseNumeric(attributes.duration),
        startDate,
        endDate,
      };
      parsed.workouts.push(workout);
    },
    ActivitySummary: (attributes) => {
      parsed.activitySummaryCount += 1;

      let date: Date | null = null;
      if (attributes.dateComponents) {
        date = new Date(`${attributes.dateComponents}T00:00:00`);
      } else if (attributes.year && attributes.month && attributes.day) {
        date = new Date(
          `${attributes.year}-${attributes.month.padStart(2, "0")}-${attributes.day.padStart(2, "0")}T00:00:00`,
        );
      }

      updateCoverage(date);

      if (!date) {
        return;
      }

      const sample: ActivitySummarySample = {
        date,
        activeEnergyBurned: parseNumeric(attributes.activeEnergyBurned),
        appleExerciseTime: parseNumeric(attributes.appleExerciseTime),
        appleStandHours: parseNumeric(attributes.appleStandHours),
      };
      parsed.activitySummaries.push(sample);
    },
  };

  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (tag) => {
    const handler = handlers[tag.name as HandlerName];
    if (handler) {
      handler(plainAttributes(tag.attributes));
    }
  });

  const stream = mainXmlEntry.stream();
  const decoder = new StringDecoder("utf8");
  let parseError: Error | null = null;

  parser.on("error", (error) => {
    parseError = error instanceof Error ? error : new Error(String(error));
  });

  for await (const chunk of stream) {
    if (parseError) {
      break;
    }
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    parser.write(decoder.write(buffer));
  }

  parser.write(decoder.end());
  parser.close();

  if (parseError) {
    throw parseError;
  }

  parsed.sources = [...sourceBuckets.entries()]
    .map(([canonicalName, bucket]): SourceSummary => ({
      canonicalName,
      displayName: chooseDisplayName(bucket.rawNames),
      rawNames: [...bucket.rawNames.keys()].sort(),
      recordCount: bucket.recordCount,
      workoutCount: bucket.workoutCount,
      metricCounts: bucket.metricCounts,
    }))
    .sort((left, right) => {
      const rightTotal = right.recordCount + right.workoutCount;
      const leftTotal = left.recordCount + left.workoutCount;
      return rightTotal - leftTotal;
    });

  return parsed;
}
