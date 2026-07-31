import type {
  TimeWindow,
  WorkoutSample,
  WorkoutTypeAggregate,
  WorkoutTypeHistoricalContext,
  WorkoutTypeMonthlySummary,
  WorkoutTypeWindowSummary,
  WorkoutTypeYearlySummary,
} from "../types.js";

import { average, round, subtract } from "./mathUtils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_DAYS = 365;

const WORKOUT_LABELS_EN: Record<string, string> = {
  HKWorkoutActivityTypeAmericanFootball: "American Football",
  HKWorkoutActivityTypeArchery: "Archery",
  HKWorkoutActivityTypeAustralianFootball: "Australian Football",
  HKWorkoutActivityTypeBoxing: "Boxing",
  HKWorkoutActivityTypeBadminton: "Badminton",
  HKWorkoutActivityTypeBaseball: "Baseball",
  HKWorkoutActivityTypeBasketball: "Basketball",
  HKWorkoutActivityTypeBarre: "Barre",
  HKWorkoutActivityTypeBowling: "Bowling",
  HKWorkoutActivityTypeCardioDance: "Cardio Dance",
  HKWorkoutActivityTypeClimbing: "Climbing",
  HKWorkoutActivityTypeCooldown: "Cooldown",
  HKWorkoutActivityTypeCoreTraining: "Core Training",
  HKWorkoutActivityTypeCricket: "Cricket",
  HKWorkoutActivityTypeCrossCountrySkiing: "Cross-Country Skiing",
  HKWorkoutActivityTypeCrossTraining: "Cross Training",
  HKWorkoutActivityTypeCycling: "Cycling",
  HKWorkoutActivityTypeDance: "Dance",
  HKWorkoutActivityTypeDiscSports: "Disc Sports",
  HKWorkoutActivityTypeDownhillSkiing: "Downhill Skiing",
  HKWorkoutActivityTypeElliptical: "Elliptical",
  HKWorkoutActivityTypeEquestrianSports: "Equestrian Sports",
  HKWorkoutActivityTypeFencing: "Fencing",
  HKWorkoutActivityTypeFishing: "Fishing",
  HKWorkoutActivityTypeFitnessGaming: "Fitness Gaming",
  HKWorkoutActivityTypeFlexibility: "Flexibility",
  HKWorkoutActivityTypeFunctionalStrengthTraining: "Functional Strength Training",
  HKWorkoutActivityTypeGolf: "Golf",
  HKWorkoutActivityTypeGymnastics: "Gymnastics",
  HKWorkoutActivityTypeHandball: "Handball",
  HKWorkoutActivityTypeHiking: "Hiking",
  HKWorkoutActivityTypeHighIntensityIntervalTraining: "High Intensity Interval Training",
  HKWorkoutActivityTypeHockey: "Hockey",
  HKWorkoutActivityTypeHunting: "Hunting",
  HKWorkoutActivityTypeKickboxing: "Kickboxing",
  HKWorkoutActivityTypeJumpRope: "Jump Rope",
  HKWorkoutActivityTypeLacrosse: "Lacrosse",
  HKWorkoutActivityTypeMartialArts: "Martial Arts",
  HKWorkoutActivityTypeMindAndBody: "Mind and Body",
  HKWorkoutActivityTypeMixedCardio: "Mixed Cardio",
  HKWorkoutActivityTypeOther: "Other",
  HKWorkoutActivityTypePaddleSports: "Paddle Sports",
  HKWorkoutActivityTypePickleball: "Pickleball",
  HKWorkoutActivityTypePilates: "Pilates",
  HKWorkoutActivityTypePlay: "Play",
  HKWorkoutActivityTypePreparationAndRecovery: "Preparation and Recovery",
  HKWorkoutActivityTypeRacquetball: "Racquetball",
  HKWorkoutActivityTypeRowing: "Rowing",
  HKWorkoutActivityTypeRugby: "Rugby",
  HKWorkoutActivityTypeRunning: "Running",
  HKWorkoutActivityTypeSailing: "Sailing",
  HKWorkoutActivityTypeSkatingSports: "Skating Sports",
  HKWorkoutActivityTypeSnowSports: "Snow Sports",
  HKWorkoutActivityTypeSoccer: "Soccer",
  HKWorkoutActivityTypeSocialDance: "Social Dance",
  HKWorkoutActivityTypeSoftball: "Softball",
  HKWorkoutActivityTypeStairClimbing: "Stair Climbing",
  HKWorkoutActivityTypeStairs: "Stairs",
  HKWorkoutActivityTypeSurfingSports: "Surfing Sports",
  HKWorkoutActivityTypeSwimming: "Swimming",
  HKWorkoutActivityTypeTableTennis: "Table Tennis",
  HKWorkoutActivityTypeTaiChi: "Tai Chi",
  HKWorkoutActivityTypeTennis: "Tennis",
  HKWorkoutActivityTypeTrackAndField: "Track and Field",
  HKWorkoutActivityTypeTraditionalStrengthTraining: "Traditional Strength Training",
  HKWorkoutActivityTypeVolleyball: "Volleyball",
  HKWorkoutActivityTypeWalking: "Walking",
  HKWorkoutActivityTypeWaterFitness: "Water Fitness",
  HKWorkoutActivityTypeWaterPolo: "Water Polo",
  HKWorkoutActivityTypeWaterSports: "Water Sports",
  HKWorkoutActivityTypeWheelchairRunPace: "Wheelchair Run",
  HKWorkoutActivityTypeWheelchairWalkPace: "Wheelchair Walk",
  HKWorkoutActivityTypeWrestling: "Wrestling",
  HKWorkoutActivityTypeYoga: "Yoga",
};

const WORKOUT_LABELS_ZH: Record<string, string> = {
  HKWorkoutActivityTypeAmericanFootball: "美式橄榄球",
  HKWorkoutActivityTypeArchery: "射箭",
  HKWorkoutActivityTypeAustralianFootball: "澳式橄榄球",
  HKWorkoutActivityTypeBoxing: "拳击",
  HKWorkoutActivityTypeBadminton: "羽毛球",
  HKWorkoutActivityTypeBaseball: "棒球",
  HKWorkoutActivityTypeBasketball: "篮球",
  HKWorkoutActivityTypeBarre: "芭蕾塑形",
  HKWorkoutActivityTypeBowling: "保龄球",
  HKWorkoutActivityTypeCardioDance: "有氧舞蹈",
  HKWorkoutActivityTypeClimbing: "攀岩",
  HKWorkoutActivityTypeCooldown: "整理放松",
  HKWorkoutActivityTypeCoreTraining: "核心训练",
  HKWorkoutActivityTypeCricket: "板球",
  HKWorkoutActivityTypeCrossCountrySkiing: "越野滑雪",
  HKWorkoutActivityTypeCrossTraining: "交叉训练",
  HKWorkoutActivityTypeCycling: "骑行",
  HKWorkoutActivityTypeDance: "舞蹈",
  HKWorkoutActivityTypeDiscSports: "飞盘",
  HKWorkoutActivityTypeDownhillSkiing: "高山滑雪",
  HKWorkoutActivityTypeElliptical: "椭圆机",
  HKWorkoutActivityTypeEquestrianSports: "马术",
  HKWorkoutActivityTypeFencing: "击剑",
  HKWorkoutActivityTypeFishing: "钓鱼",
  HKWorkoutActivityTypeFitnessGaming: "健身游戏",
  HKWorkoutActivityTypeFlexibility: "柔韧训练",
  HKWorkoutActivityTypeFunctionalStrengthTraining: "功能性力量训练",
  HKWorkoutActivityTypeGolf: "高尔夫",
  HKWorkoutActivityTypeGymnastics: "体操",
  HKWorkoutActivityTypeHandball: "手球",
  HKWorkoutActivityTypeHiking: "徒步",
  HKWorkoutActivityTypeHighIntensityIntervalTraining: "高强度间歇训练",
  HKWorkoutActivityTypeHockey: "曲棍球",
  HKWorkoutActivityTypeHunting: "狩猎",
  HKWorkoutActivityTypeKickboxing: "踢拳",
  HKWorkoutActivityTypeJumpRope: "跳绳",
  HKWorkoutActivityTypeLacrosse: "长曲棍球",
  HKWorkoutActivityTypeMartialArts: "武术",
  HKWorkoutActivityTypeMindAndBody: "身心训练",
  HKWorkoutActivityTypeMixedCardio: "混合有氧",
  HKWorkoutActivityTypeOther: "其他训练",
  HKWorkoutActivityTypePaddleSports: "桨类运动",
  HKWorkoutActivityTypePickleball: "匹克球",
  HKWorkoutActivityTypePilates: "普拉提",
  HKWorkoutActivityTypePlay: "休闲活动",
  HKWorkoutActivityTypePreparationAndRecovery: "恢复训练",
  HKWorkoutActivityTypeRacquetball: "墙网球",
  HKWorkoutActivityTypeRowing: "划船",
  HKWorkoutActivityTypeRugby: "橄榄球",
  HKWorkoutActivityTypeRunning: "跑步",
  HKWorkoutActivityTypeSailing: "帆船",
  HKWorkoutActivityTypeSkatingSports: "滑行运动",
  HKWorkoutActivityTypeSnowSports: "雪上运动",
  HKWorkoutActivityTypeSoccer: "足球",
  HKWorkoutActivityTypeSocialDance: "社交舞",
  HKWorkoutActivityTypeSoftball: "垒球",
  HKWorkoutActivityTypeStairClimbing: "登阶训练",
  HKWorkoutActivityTypeStairs: "爬楼",
  HKWorkoutActivityTypeSurfingSports: "冲浪",
  HKWorkoutActivityTypeSwimming: "游泳",
  HKWorkoutActivityTypeTableTennis: "乒乓球",
  HKWorkoutActivityTypeTaiChi: "太极",
  HKWorkoutActivityTypeTennis: "网球",
  HKWorkoutActivityTypeTrackAndField: "田径",
  HKWorkoutActivityTypeTraditionalStrengthTraining: "传统力量训练",
  HKWorkoutActivityTypeVolleyball: "排球",
  HKWorkoutActivityTypeWalking: "步行",
  HKWorkoutActivityTypeWaterFitness: "水中健身",
  HKWorkoutActivityTypeWaterPolo: "水球",
  HKWorkoutActivityTypeWaterSports: "水上运动",
  HKWorkoutActivityTypeWheelchairRunPace: "轮椅跑",
  HKWorkoutActivityTypeWheelchairWalkPace: "轮椅步行",
  HKWorkoutActivityTypeWrestling: "摔跤",
  HKWorkoutActivityTypeYoga: "瑜伽",
};

export type WorkoutLabelLocale = "zh" | "en";

function compareWorkoutGroupsByCount(
  left: { count: number; totalDurationMinutes: number | null; type: string },
  right: { count: number; totalDurationMinutes: number | null; type: string },
) {
  const countGap = right.count - left.count;
  if (countGap !== 0) {
    return countGap;
  }
  const durationGap = (right.totalDurationMinutes ?? -1) - (left.totalDurationMinutes ?? -1);
  if (durationGap !== 0) {
    return durationGap;
  }
  return left.type.localeCompare(right.type);
}

function compareWorkoutGroupsByDuration(
  left: { count: number; totalDurationMinutes: number | null; type: string },
  right: { count: number; totalDurationMinutes: number | null; type: string },
) {
  const durationGap = (right.totalDurationMinutes ?? -1) - (left.totalDurationMinutes ?? -1);
  if (durationGap !== 0) {
    return durationGap;
  }
  const countGap = right.count - left.count;
  if (countGap !== 0) {
    return countGap;
  }
  return left.type.localeCompare(right.type);
}

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function inclusiveDays(start: Date | null, end: Date | null): number {
  if (!start || !end || end < start) {
    return 0;
  }
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

export function summarizeWorkoutWindow(workouts: WorkoutSample[]): WorkoutTypeWindowSummary {
  if (workouts.length === 0) {
    return {
      workouts: 0,
      daysWithWorkouts: 0,
      totalDurationMinutes: null,
      averageDurationMinutes: null,
      longestWorkoutMinutes: null,
      totalActiveEnergyBurnedKcal: null,
      averageActiveEnergyBurnedKcal: null,
      averageHeartRateBpm: null,
      maxHeartRateBpm: null,
      totalDistanceKm: null,
      averageDistanceKm: null,
      averageMETs: null,
      heartRateCoveragePct: null,
      distanceCoveragePct: null,
      activeEnergyCoveragePct: null,
      metsCoveragePct: null,
      firstWorkoutDate: null,
      lastWorkoutDate: null,
    };
  }

  const durations = workouts
    .map((workout) => workout.durationMinutes)
    .filter((value): value is number => value !== null);
  const activeEnergy = workouts
    .map((workout) => workout.activeEnergyBurnedKcal)
    .filter((value): value is number => value !== null);
  const averageHeartRate = workouts
    .map((workout) => workout.averageHeartRateBpm)
    .filter((value): value is number => value !== null);
  const maxHeartRate = workouts
    .map((workout) => workout.maxHeartRateBpm)
    .filter((value): value is number => value !== null);
  const distance = workouts
    .map((workout) => workout.distanceKm)
    .filter((value): value is number => value !== null);
  const mets = workouts
    .map((workout) => workout.averageMETs)
    .filter((value): value is number => value !== null);
  const sorted = [...workouts].sort((left, right) => left.startDate.getTime() - right.startDate.getTime());

  return {
    workouts: workouts.length,
    daysWithWorkouts: new Set(workouts.map((workout) => workout.startDate.toISOString().slice(0, 10))).size,
    totalDurationMinutes: durations.length > 0 ? round(durations.reduce((sum, value) => sum + value, 0)) : null,
    averageDurationMinutes: round(average(durations)),
    longestWorkoutMinutes: durations.length > 0 ? round(Math.max(...durations)) : null,
    totalActiveEnergyBurnedKcal:
      activeEnergy.length > 0 ? round(activeEnergy.reduce((sum, value) => sum + value, 0)) : null,
    averageActiveEnergyBurnedKcal: round(average(activeEnergy)),
    averageHeartRateBpm: round(average(averageHeartRate)),
    maxHeartRateBpm: maxHeartRate.length > 0 ? round(Math.max(...maxHeartRate)) : null,
    totalDistanceKm: distance.length > 0 ? round(distance.reduce((sum, value) => sum + value, 0)) : null,
    averageDistanceKm: round(average(distance)),
    averageMETs: round(average(mets)),
    heartRateCoveragePct: round((averageHeartRate.length / workouts.length) * 100),
    distanceCoveragePct: round((distance.length / workouts.length) * 100),
    activeEnergyCoveragePct: round((activeEnergy.length / workouts.length) * 100),
    metsCoveragePct: round((mets.length / workouts.length) * 100),
    firstWorkoutDate: sorted[0]?.startDate.toISOString() ?? null,
    lastWorkoutDate: sorted.at(-1)?.startDate.toISOString() ?? null,
  };
}

function summarizeYearly(workouts: WorkoutSample[]): WorkoutTypeYearlySummary[] {
  const buckets = new Map<number, WorkoutSample[]>();
  for (const workout of workouts) {
    const year = workout.startDate.getUTCFullYear();
    buckets.set(year, [...(buckets.get(year) ?? []), workout]);
  }

  return [...buckets.entries()]
    .sort(([leftYear], [rightYear]) => leftYear - rightYear)
    .map(([year, items]) => {
      const summary = summarizeWorkoutWindow(items);
      return {
        year,
        workouts: summary.workouts,
        totalDurationMinutes: summary.totalDurationMinutes,
        averageDurationMinutes: summary.averageDurationMinutes,
      };
    });
}

function summarizeRecentMonths(workouts: WorkoutSample[], effectiveEnd: Date): WorkoutTypeMonthlySummary[] {
  const months: WorkoutTypeMonthlySummary[] = [];
  const monthBuckets = new Map<string, WorkoutSample[]>();
  for (const workout of workouts) {
    const key = monthKey(workout.startDate);
    monthBuckets.set(key, [...(monthBuckets.get(key) ?? []), workout]);
  }

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(
      Date.UTC(
        effectiveEnd.getUTCFullYear(),
        effectiveEnd.getUTCMonth() - offset,
        1,
      ),
    );
    const key = monthKey(monthDate);
    const summary = summarizeWorkoutWindow(monthBuckets.get(key) ?? []);
    months.push({
      month: key,
      workouts: summary.workouts,
      totalDurationMinutes: summary.totalDurationMinutes,
      averageDurationMinutes: summary.averageDurationMinutes,
    });
  }

  return months;
}

export function stableWorkoutTypeId(raw: string): string {
  return raw
    .replace(/^HKWorkoutActivityType/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

export function formatWorkoutType(raw: string, locale: WorkoutLabelLocale = "en"): string {
  const labels = locale === "zh" ? WORKOUT_LABELS_ZH : WORKOUT_LABELS_EN;
  if (labels[raw]) {
    return labels[raw];
  }

  return raw
    .replace(/^HKWorkoutActivityType/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

export function summarizeWorkoutTypes(
  workouts: WorkoutSample[],
  locale: WorkoutLabelLocale = "en",
): WorkoutTypeAggregate[] {
  const buckets = new Map<string, WorkoutSample[]>();
  for (const workout of workouts) {
    buckets.set(workout.workoutActivityType, [...(buckets.get(workout.workoutActivityType) ?? []), workout]);
  }

  return [...buckets.entries()]
    .map(([type, items]) => {
      const summary = summarizeWorkoutWindow(items);
      return {
        type,
        label: formatWorkoutType(type, locale),
        count: summary.workouts,
        totalDurationMinutes: summary.totalDurationMinutes,
        averageDurationMinutes: summary.averageDurationMinutes,
      };
    })
    .sort(compareWorkoutGroupsByCount);
}

export function buildWorkoutRateDelta(
  recentCount: number,
  recentStart: Date | null,
  recentEnd: Date | null,
  comparisonCount: number,
  comparisonStart: Date | null,
  comparisonEnd: Date | null,
): number | null {
  const recentDays = inclusiveDays(recentStart, recentEnd);
  const comparisonDays = inclusiveDays(comparisonStart, comparisonEnd);
  if (recentDays === 0 || comparisonDays === 0) {
    return null;
  }

  return subtract(round((recentCount / recentDays) * 30), round((comparisonCount / comparisonDays) * 30));
}

export function buildWorkoutTypeHistoricalContext(
  workouts: WorkoutSample[],
  window: TimeWindow,
  locale: WorkoutLabelLocale = "en",
): WorkoutTypeHistoricalContext[] {
  const filtered = workouts.filter((workout) => {
    if (window.effectiveStart && workout.startDate < window.effectiveStart) {
      return false;
    }
    return workout.startDate <= window.effectiveEnd;
  });
  const trailing180dStart = new Date(window.effectiveEnd.getTime() - 179 * 24 * 60 * 60 * 1000);
  const trailing365dStart = new Date(window.effectiveEnd.getTime() - (YEAR_DAYS - 1) * DAY_MS);
  const baselineWindowStart =
    window.effectiveStart && window.effectiveStart > window.baselineStart ? window.effectiveStart : window.baselineStart;
  const baselineWindowEnd = new Date(window.recentStart.getTime() - 1);
  const buckets = new Map<string, WorkoutSample[]>();
  for (const workout of filtered) {
    buckets.set(workout.workoutActivityType, [...(buckets.get(workout.workoutActivityType) ?? []), workout]);
  }

  return [...buckets.entries()]
    .map(([type, items]) => {
      const recent = items.filter(
        (workout) => workout.startDate >= window.recentStart && workout.startDate <= window.effectiveEnd,
      );
      const baseline = items.filter(
        (workout) => workout.startDate >= window.baselineStart && workout.startDate < window.recentStart,
      );
      const trailing = items.filter(
        (workout) => workout.startDate >= trailing180dStart && workout.startDate <= window.effectiveEnd,
      );
      const trailing365 = items.filter(
        (workout) => workout.startDate >= trailing365dStart && workout.startDate <= window.effectiveEnd,
      );

      const recentSummary = summarizeWorkoutWindow(recent);
      const baselineSummary = summarizeWorkoutWindow(baseline);
      const trailingSummary = summarizeWorkoutWindow(trailing);
      const trailing365Summary = summarizeWorkoutWindow(trailing365);
      const allTimeSummary = summarizeWorkoutWindow(items);

      return {
        type,
        label: formatWorkoutType(type, locale),
        recent30d: recentSummary,
        baseline90d: baselineSummary,
        trailing180d: trailingSummary,
        trailing365d: trailing365Summary,
        allTime: allTimeSummary,
        recentVsBaseline90d: {
          workouts: buildWorkoutRateDelta(
            recentSummary.workouts,
            window.recentStart,
            window.effectiveEnd,
            baselineSummary.workouts,
            baselineWindowStart,
            baselineWindowEnd,
          ),
          totalDurationMinutes: subtract(recentSummary.totalDurationMinutes, baselineSummary.totalDurationMinutes),
          averageDurationMinutes: subtract(recentSummary.averageDurationMinutes, baselineSummary.averageDurationMinutes),
        },
        recentVsTrailing180d: {
          workouts: buildWorkoutRateDelta(
            recentSummary.workouts,
            window.recentStart,
            window.effectiveEnd,
            trailingSummary.workouts,
            trailing180dStart,
            window.effectiveEnd,
          ),
          totalDurationMinutes: subtract(recentSummary.totalDurationMinutes, trailingSummary.totalDurationMinutes),
          averageDurationMinutes: subtract(
            recentSummary.averageDurationMinutes,
            trailingSummary.averageDurationMinutes,
          ),
        },
        recentVsAllTime: {
          workouts: buildWorkoutRateDelta(
            recentSummary.workouts,
            window.recentStart,
            window.effectiveEnd,
            allTimeSummary.workouts,
            window.effectiveStart ?? filtered[0]?.startDate ?? null,
            window.effectiveEnd,
          ),
          totalDurationMinutes: subtract(recentSummary.totalDurationMinutes, allTimeSummary.totalDurationMinutes),
          averageDurationMinutes: subtract(recentSummary.averageDurationMinutes, allTimeSummary.averageDurationMinutes),
        },
        yearly: summarizeYearly(items),
        recentMonths: summarizeRecentMonths(items, window.effectiveEnd),
      };
    })
    .sort((left, right) =>
      compareWorkoutGroupsByDuration(
        {
          type: left.type,
          count: left.allTime.workouts,
          totalDurationMinutes: left.allTime.totalDurationMinutes,
        },
        {
          type: right.type,
          count: right.allTime.workouts,
          totalDurationMinutes: right.allTime.totalDurationMinutes,
        },
      ),
    );
}
