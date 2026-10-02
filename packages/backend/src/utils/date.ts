export const BANGLADESH_TZ = 'Asia/Dhaka';
const BD_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka is fixed UTC+6 (360 minutes offset, no DST)

export interface DayBounds {
  start: Date;
  end: Date;
  /** Local date string in Bangladesh timezone, e.g. '2026-08-04' */
  dateKey: string;
}

/**
 * Returns the Bangladesh (Asia/Dhaka, UTC+6) day window that `date` falls into,
 * as absolute UTC Date boundaries, plus the local 'YYYY-MM-DD' key for that day.
 */
export function getBangladeshDayBounds(date: Date = new Date()): DayBounds {
  const bdTime = new Date(date.getTime() + BD_OFFSET_MS);
  const year = bdTime.getUTCFullYear();
  const month = bdTime.getUTCMonth();
  const day = bdTime.getUTCDate();

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - BD_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0) - BD_OFFSET_MS);

  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { start, end, dateKey };
}

/**
 * Returns the Bangladesh (Asia/Dhaka) calendar-month window that `date`
 * falls into, plus a `YYYY-MM` key. Used by the monthly ranking boards.
 */
export function getBangladeshMonthBounds(date: Date = new Date()): DayBounds {
  const bdTime = new Date(date.getTime() + BD_OFFSET_MS);
  const year = bdTime.getUTCFullYear();
  const month = bdTime.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - BD_OFFSET_MS);
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - BD_OFFSET_MS);

  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  return { start, end, dateKey };
}

/**
 * Returns the current 7-day count cycle window in Bangladesh time.
 * The cycle starts at a fixed weekly boundary (Monday 00:00 Asia/Dhaka by default)
 * and lasts 7 days, so all users share the same cycle start/end.
 */
export function getRewardCycleBounds(date: Date = new Date(), cycleStartDay: number = 1): DayBounds {
  const bdTime = new Date(date.getTime() + BD_OFFSET_MS);
  const year = bdTime.getUTCFullYear();
  const month = bdTime.getUTCMonth();
  const day = bdTime.getUTCDate();
  const dayOfWeek = bdTime.getUTCDay(); // 0 = Sunday ... 6 = Saturday

  const daysSinceCycleStart = (dayOfWeek - cycleStartDay + 7) % 7;
  const startDay = day - daysSinceCycleStart;

  const start = new Date(Date.UTC(year, month, startDay, 0, 0, 0, 0) - BD_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, startDay + 7, 0, 0, 0, 0) - BD_OFFSET_MS);

  const startBd = new Date(start.getTime() + BD_OFFSET_MS);
  const dateKey = `${startBd.getUTCFullYear()}-${String(startBd.getUTCMonth() + 1).padStart(2, '0')}-${String(startBd.getUTCDate()).padStart(2, '0')}`;

  return { start, end, dateKey };
}
