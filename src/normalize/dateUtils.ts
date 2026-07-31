const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a calendar date independently of the machine's timezone.
 *
 * CLI date flags and HealthKit `dateComponents` are calendar dates, not local
 * timestamps. Representing them at UTC midnight keeps filtering and rendering
 * deterministic across machines.
 */
export function parseUtcDateOnly(value: string): Date | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftUtcDateToOffset(date: Date, offsetMinutes: number): Date {
  return new Date(date.getTime() - offsetMinutes * 60 * 1000);
}

export function endOfDayAtOffset(date: Date, offsetMinutes: number): Date {
  const clock = sourceClockDate(date, offsetMinutes);
  return new Date(
    Date.UTC(
      clock.getUTCFullYear(),
      clock.getUTCMonth(),
      clock.getUTCDate(),
      23,
      59,
      59,
      999,
    ) -
      offsetMinutes * 60 * 1000,
  );
}

export function startOfDayAtOffset(date: Date, offsetMinutes: number): Date {
  const clock = sourceClockDate(date, offsetMinutes);
  return new Date(
    Date.UTC(
      clock.getUTCFullYear(),
      clock.getUTCMonth(),
      clock.getUTCDate(),
    ) -
      offsetMinutes * 60 * 1000,
  );
}

export function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Shift an absolute timestamp onto a UTC-backed clock carrying the source
 * timestamp's wall-clock fields. UTC getters on the result are deterministic.
 */
export function sourceClockDate(date: Date, offsetMinutes: number | undefined): Date {
  return new Date(date.getTime() + (offsetMinutes ?? 0) * 60 * 1000);
}

export function sourceDateKey(date: Date, offsetMinutes: number | undefined): string {
  return toUtcDateKey(sourceClockDate(date, offsetMinutes));
}
