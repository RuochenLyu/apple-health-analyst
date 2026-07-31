import { BASELINE_DAYS, RECENT_DAYS, type TimeWindow } from "../types.js";

import {
  addUtcDays,
  endOfDayAtOffset,
  parseUtcDateOnly,
  shiftUtcDateToOffset,
  startOfDayAtOffset,
} from "./dateUtils.js";

function parseDateOnly(value: string | undefined, offsetMinutes: number): Date | null {
  if (!value) {
    return null;
  }
  const candidate = parseUtcDateOnly(value);
  if (!candidate) {
    throw new Error(`Invalid date: ${value}. Expected YYYY-MM-DD.`);
  }
  return shiftUtcDateToOffset(candidate, offsetMinutes);
}

function subtractDays(date: Date, days: number): Date {
  return addUtcDays(date, -days);
}

export function buildTimeWindow(
  rawFrom: string | undefined,
  rawTo: string | undefined,
  anchorEnd: Date,
  calendarOffsetMinutes = 0,
): TimeWindow {
  const requestedFrom = parseDateOnly(rawFrom, calendarOffsetMinutes);
  const requestedTo = rawTo
    ? endOfDayAtOffset(
        parseDateOnly(rawTo, calendarOffsetMinutes) as Date,
        calendarOffsetMinutes,
      )
    : null;

  if (requestedFrom && requestedTo && requestedFrom > requestedTo) {
    throw new Error("--from must be earlier than or equal to --to.");
  }

  const effectiveEnd = requestedTo ?? anchorEnd;
  const effectiveStart = requestedFrom;
  const recentStart = subtractDays(
    startOfDayAtOffset(effectiveEnd, calendarOffsetMinutes),
    RECENT_DAYS - 1,
  );
  const baselineStart = subtractDays(recentStart, BASELINE_DAYS);

  return {
    requestedFrom,
    requestedTo,
    effectiveStart,
    effectiveEnd,
    recentStart,
    baselineStart,
    calendarOffsetMinutes,
  };
}

export function isWithinWindow(date: Date, window: TimeWindow): boolean {
  if (window.effectiveStart && date < window.effectiveStart) {
    return false;
  }
  if (date > window.effectiveEnd) {
    return false;
  }
  return true;
}
