import { StringDecoder } from "node:string_decoder";
import { SaxesParser } from "saxes";

import type {
  ActivitySummarySample,
  AttachmentSummary,
  BiologicalSex,
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
import { parseUtcDateOnly } from "../normalize/dateUtils.js";

interface ZipEntryLike {
  path: string;
  type?: string;
  stream: () => NodeJS.ReadableStream;
}

type HandlerName = "HealthData" | "Me" | "ExportDate" | "Record" | "ActivitySummary";

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

const ACTIVITY_SUMMARY_MIN_DATE = new Date("2015-01-01T00:00:00.000Z");

function parseNumeric(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanLike(value: string | undefined): boolean | null {
  if (value === "1" || value?.toLowerCase() === "true") {
    return true;
  }
  if (value === "0" || value?.toLowerCase() === "false") {
    return false;
  }
  return null;
}

function normalizedUnit(unit: string | undefined): string {
  return (unit ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeQuantity(
  metric: Exclude<MetricKey, "sleep">,
  value: number,
  unit: string | undefined,
): { value: number; unit: string } | null {
  const normalized = normalizedUnit(unit);

  if (metric === "bodyMass") {
    if (normalized === "kg") return { value, unit: "kg" };
    if (normalized === "g") return { value: value / 1000, unit: "kg" };
    if (normalized === "lb" || normalized === "lbs") {
      return { value: value * 0.45359237, unit: "kg" };
    }
    if (normalized === "oz") return { value: value * 0.028349523125, unit: "kg" };
    if (normalized === "st" || normalized === "stone") {
      return { value: value * 6.35029318, unit: "kg" };
    }
    return null;
  }

  if (metric === "oxygenSaturation" || metric === "bodyFatPercentage") {
    if (normalized !== "%" && normalized !== "percent") {
      return null;
    }
    return { value: value <= 1 ? value * 100 : value, unit: "%" };
  }

  if (metric === "restingHeartRate") {
    return ["count/min", "bpm", "beats/min"].includes(normalized)
      ? { value, unit: "bpm" }
      : null;
  }

  if (metric === "respiratoryRate") {
    return ["count/min", "breaths/min"].includes(normalized)
      ? { value, unit: "breaths/min" }
      : null;
  }

  if (metric === "hrv") {
    if (normalized === "ms") return { value, unit: "ms" };
    if (normalized === "s") return { value: value * 1000, unit: "ms" };
    return null;
  }

  if (metric === "vo2Max") {
    return ["ml/min·kg", "ml/kg/min", "ml/(kg*min)", "ml·kg^-1·min^-1"].includes(normalized)
      ? { value, unit: "mL/kg/min" }
      : null;
  }

  return null;
}

function normalizeDurationMinutes(value: number, unit: string | undefined): number | null {
  const normalized = normalizedUnit(unit);
  if (normalized === "min" || normalized === "minute" || normalized === "minutes") {
    return value;
  }
  if (normalized === "s" || normalized === "sec" || normalized === "second" || normalized === "seconds") {
    return value / 60;
  }
  if (normalized === "h" || normalized === "hr" || normalized === "hour" || normalized === "hours") {
    return value * 60;
  }
  return null;
}

function normalizeEnergyKcal(value: number, unit: string | undefined): number | null {
  const normalized = normalizedUnit(unit);
  if (normalized === "kcal" || normalized === "cal") {
    return value;
  }
  if (normalized === "kj") {
    return value / 4.184;
  }
  if (normalized === "j") {
    return value / 4184;
  }
  return null;
}

function normalizeRatePerMinute(value: number, unit: string | undefined): number | null {
  return ["count/min", "bpm", "beats/min"].includes(normalizedUnit(unit)) ? value : null;
}

function normalizeDistance(value: number, unit: string | undefined): number | null {
  const normalized = normalizedUnit(unit);
  if (normalized === "km") {
    return value;
  }
  if (normalized === "m") {
    return value / 1000;
  }
  if (normalized === "mi" || normalized === "mile" || normalized === "miles") {
    return value * 1.60934;
  }
  return null;
}

function parseTimestamp(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTimezoneOffsetMinutes(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  if (/Z$/i.test(value)) {
    return 0;
  }
  const match = /([+-])(\d{2}):?(\d{2})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
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
    biologicalSex: null,
    exportDate: null,
    exportTimezoneOffsetMinutes: undefined,
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
    dataQuality: {
      excludedInvalidTimestampSamples: 0,
      excludedImplausibleActivitySummaries: 0,
      excludedUnsupportedUnitValues: 0,
      deduplicatedWorkoutRecords: 0,
    },
  };
  const dataQuality = parsed.dataQuality!;
  let currentWorkout: WorkoutSample | null = null;

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
    Me: (attributes) => {
      const raw = attributes.HKCharacteristicTypeIdentifierBiologicalSex ?? "";
      const sexMap: Record<string, BiologicalSex> = {
        HKBiologicalSexFemale: "female",
        HKBiologicalSexMale: "male",
        HKBiologicalSexOther: "other",
      };
      parsed.biologicalSex = sexMap[raw] ?? null;
    },
    ExportDate: (attributes) => {
      parsed.exportDate = parseTimestamp(attributes.value);
      parsed.exportTimezoneOffsetMinutes = parseTimezoneOffsetMinutes(attributes.value);
    },
    Record: (attributes) => {
      parsed.recordCount += 1;

      const sourceName = attributes.sourceName;
      const recordType = attributes.type;
      const metric = recordType ? RECORD_TYPE_MAP[recordType] : undefined;
      const startDate = parseTimestamp(attributes.startDate);
      const endDate = attributes.endDate ? parseTimestamp(attributes.endDate) : startDate;

      if (sourceName) {
        registerSource(sourceName, "record", metric);
      }

      if (!startDate || !endDate || endDate < startDate) {
        dataQuality.excludedInvalidTimestampSamples += 1;
        return;
      }

      updateCoverage(startDate);
      updateCoverage(endDate);

      const categoryMetric = recordType ? CATEGORY_RECORD_MAP[recordType] : undefined;
      if (categoryMetric && sourceName && startDate && endDate) {
        const canonicalSource = canonicalizeSourceName(sourceName);
        const sample = {
          metric: categoryMetric,
          sourceName,
          canonicalSource,
          startDate,
          endDate,
          startTimezoneOffsetMinutes: parseTimezoneOffsetMinutes(attributes.startDate),
          endTimezoneOffsetMinutes: parseTimezoneOffsetMinutes(
            attributes.endDate ?? attributes.startDate,
          ),
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
          startTimezoneOffsetMinutes: parseTimezoneOffsetMinutes(attributes.startDate),
          endTimezoneOffsetMinutes: parseTimezoneOffsetMinutes(
            attributes.endDate ?? attributes.startDate,
          ),
          value: attributes.value ?? "",
        };
        parsed.records.sleep.push(sleepSample);
        return;
      }

      const rawValue = parseNumeric(attributes.value);
      if (rawValue === null) {
        return;
      }
      const normalized = normalizeQuantity(metric, rawValue, attributes.unit);
      if (!normalized) {
        dataQuality.excludedUnsupportedUnitValues += 1;
        return;
      }

      const quantitySample: QuantitySample = {
        metric,
        sourceName,
        canonicalSource,
        startDate,
        endDate,
        startTimezoneOffsetMinutes: parseTimezoneOffsetMinutes(attributes.startDate),
        endTimezoneOffsetMinutes: parseTimezoneOffsetMinutes(
          attributes.endDate ?? attributes.startDate,
        ),
        unit: normalized.unit,
        value: normalized.value,
      };
      parsed.records[metric].push(quantitySample);
    },
    ActivitySummary: (attributes) => {
      parsed.activitySummaryCount += 1;

      let date: Date | null = null;
      if (attributes.dateComponents) {
        date = parseUtcDateOnly(attributes.dateComponents);
      } else if (attributes.year && attributes.month && attributes.day) {
        date = parseUtcDateOnly(
          `${attributes.year.padStart(4, "0")}-${attributes.month.padStart(2, "0")}-${attributes.day.padStart(2, "0")}`,
        );
      }

      if (!date) {
        dataQuality.excludedInvalidTimestampSamples += 1;
        return;
      }

      // Unix-epoch-adjacent ActivitySummary rows are missing-date sentinels
      // found in real exports. Activity summaries cannot predate HealthKit.
      if (date < ACTIVITY_SUMMARY_MIN_DATE) {
        dataQuality.excludedImplausibleActivitySummaries += 1;
        return;
      }

      updateCoverage(date);

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
    const attributes = plainAttributes(tag.attributes);
    if (tag.name === "Workout") {
      parsed.workoutCount += 1;
      const sourceName = attributes.sourceName ?? "未知来源";
      const startDate = parseTimestamp(attributes.startDate);
      const endDate = attributes.endDate ? parseTimestamp(attributes.endDate) : startDate;

      registerSource(sourceName, "workout");

      if (!startDate || !endDate || endDate < startDate) {
        dataQuality.excludedInvalidTimestampSamples += 1;
        currentWorkout = null;
        return;
      }

      updateCoverage(startDate);
      updateCoverage(endDate);

      const rawDuration = parseNumeric(attributes.duration);
      const durationMinutes =
        rawDuration === null ? null : normalizeDurationMinutes(rawDuration, attributes.durationUnit);
      if (rawDuration !== null && durationMinutes === null) {
        dataQuality.excludedUnsupportedUnitValues += 1;
      }

      currentWorkout = {
        sourceName,
        canonicalSource: canonicalizeSourceName(sourceName),
        workoutActivityType: attributes.workoutActivityType ?? "HKWorkoutActivityTypeOther",
        durationMinutes,
        startDate,
        endDate,
        startTimezoneOffsetMinutes: parseTimezoneOffsetMinutes(attributes.startDate),
        endTimezoneOffsetMinutes: parseTimezoneOffsetMinutes(
          attributes.endDate ?? attributes.startDate,
        ),
        activeEnergyBurnedKcal: null,
        basalEnergyBurnedKcal: null,
        distanceKm: null,
        averageHeartRateBpm: null,
        minHeartRateBpm: null,
        maxHeartRateBpm: null,
        averageMETs: null,
        isIndoor: null,
      };
      return;
    }

    if (tag.name === "WorkoutStatistics" && currentWorkout) {
      const metricType = attributes.type ?? "";
      if (metricType === "HKQuantityTypeIdentifierActiveEnergyBurned") {
        const raw = parseNumeric(attributes.sum);
        currentWorkout.activeEnergyBurnedKcal =
          raw === null ? null : normalizeEnergyKcal(raw, attributes.unit);
        if (raw !== null && currentWorkout.activeEnergyBurnedKcal === null) {
          dataQuality.excludedUnsupportedUnitValues += 1;
        }
      } else if (metricType === "HKQuantityTypeIdentifierBasalEnergyBurned") {
        const raw = parseNumeric(attributes.sum);
        currentWorkout.basalEnergyBurnedKcal =
          raw === null ? null : normalizeEnergyKcal(raw, attributes.unit);
        if (raw !== null && currentWorkout.basalEnergyBurnedKcal === null) {
          dataQuality.excludedUnsupportedUnitValues += 1;
        }
      } else if (metricType === "HKQuantityTypeIdentifierHeartRate") {
        const average = parseNumeric(attributes.average);
        const minimum = parseNumeric(attributes.minimum);
        const maximum = parseNumeric(attributes.maximum);
        currentWorkout.averageHeartRateBpm =
          average === null ? null : normalizeRatePerMinute(average, attributes.unit);
        currentWorkout.minHeartRateBpm =
          minimum === null ? null : normalizeRatePerMinute(minimum, attributes.unit);
        currentWorkout.maxHeartRateBpm =
          maximum === null ? null : normalizeRatePerMinute(maximum, attributes.unit);
        if (
          (average !== null || minimum !== null || maximum !== null) &&
          currentWorkout.averageHeartRateBpm === null &&
          currentWorkout.minHeartRateBpm === null &&
          currentWorkout.maxHeartRateBpm === null
        ) {
          dataQuality.excludedUnsupportedUnitValues += 1;
        }
      } else if (metricType.startsWith("HKQuantityTypeIdentifierDistance")) {
        const distance = parseNumeric(attributes.sum);
        currentWorkout.distanceKm =
          distance === null ? null : normalizeDistance(distance, attributes.unit);
        if (distance !== null && currentWorkout.distanceKm === null) {
          dataQuality.excludedUnsupportedUnitValues += 1;
        }
      }
      return;
    }

    if (tag.name === "MetadataEntry" && currentWorkout) {
      const key = attributes.key ?? "";
      if (key === "HKAverageMETs") {
        currentWorkout.averageMETs = parseNumeric(attributes.value);
      } else if (key === "HKIndoorWorkout") {
        currentWorkout.isIndoor = parseBooleanLike(attributes.value);
      }
      return;
    }

    const handler = handlers[tag.name as HandlerName];
    if (handler) {
      handler(attributes);
    }
  });
  parser.on("closetag", (tag) => {
    if (tag.name === "Workout" && currentWorkout) {
      parsed.workouts.push(currentWorkout);
      currentWorkout = null;
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
