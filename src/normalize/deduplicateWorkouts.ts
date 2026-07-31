import type { WorkoutSample } from "../types.js";

const START_TOLERANCE_MS = 90 * 1000;
const DURATION_TOLERANCE_MINUTES = 2;

function completeness(workout: WorkoutSample): number {
  return [
    workout.durationMinutes,
    workout.activeEnergyBurnedKcal,
    workout.basalEnergyBurnedKcal,
    workout.distanceKm,
    workout.averageHeartRateBpm,
    workout.minHeartRateBpm,
    workout.maxHeartRateBpm,
    workout.averageMETs,
    workout.isIndoor,
  ].filter((value) => value !== null && value !== undefined).length;
}

function durationMinutes(workout: WorkoutSample): number {
  return (
    workout.durationMinutes ??
    Math.max(0, (workout.endDate.getTime() - workout.startDate.getTime()) / 60_000)
  );
}

function isDuplicate(left: WorkoutSample, right: WorkoutSample): boolean {
  return (
    left.workoutActivityType === right.workoutActivityType &&
    Math.abs(left.startDate.getTime() - right.startDate.getTime()) <=
      START_TOLERANCE_MS &&
    Math.abs(durationMinutes(left) - durationMinutes(right)) <=
      DURATION_TOLERANCE_MINUTES
  );
}

/**
 * Collapse near-identical cross-source workout records while retaining the
 * single record with the richest metric coverage. This intentionally uses a
 * narrow match: different activity types or sessions starting more than
 * 90 seconds apart remain separate.
 */
export function deduplicateWorkouts(workouts: WorkoutSample[]): {
  workouts: WorkoutSample[];
  removedCount: number;
} {
  const sorted = workouts
    .slice()
    .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  const kept: WorkoutSample[] = [];
  let removedCount = 0;

  for (const workout of sorted) {
    let duplicateIndex = -1;
    for (let index = kept.length - 1; index >= 0; index -= 1) {
      const candidate = kept[index];
      const startDelta =
        workout.startDate.getTime() - candidate.startDate.getTime();
      if (startDelta > START_TOLERANCE_MS) {
        break;
      }
      if (isDuplicate(candidate, workout)) {
        duplicateIndex = index;
        break;
      }
    }

    if (duplicateIndex === -1) {
      kept.push(workout);
      continue;
    }

    removedCount += 1;
    if (completeness(workout) > completeness(kept[duplicateIndex])) {
      kept[duplicateIndex] = workout;
    }
  }

  return { workouts: kept, removedCount };
}
