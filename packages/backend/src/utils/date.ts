import { toDate, fromZonedTime } from 'date-fns-tz';

export const BANGLADESH_TZ = 'Asia/Dhaka';

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
  const local = toDate(date, { timeZone: BANGLADESH_TZ });
  const year = local.getFullYear();
  const month = local.getMonth();
  const day = local.getDate();

  const start = fromZonedTime(new Date(year, month, day, 0, 0, 0, 0), BANGLADESH_TZ);
  const end = fromZonedTime(new Date(year, month, day + 1, 0, 0, 0, 0), BANGLADESH_TZ);

  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { start, end, dateKey };
}

/**
 * Returns the Bangladesh (Asia/Dhaka) calendar-month window that `date`
 * falls into, plus a `YYYY-MM` key. Used by the monthly ranking boards.
 */
export function getBangladeshMonthBounds(date: Date = new Date()): DayBounds {
  const local = toDate(date, { timeZone: BANGLADESH_TZ });
  const year = local.getFullYear();
  const month = local.getMonth();

  const start = fromZonedTime(new Date(year, month, 1, 0, 0, 0, 0), BANGLADESH_TZ);
  const end = fromZonedTime(new Date(year, month + 1, 1, 0, 0, 0, 0), BANGLADESH_TZ);

  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  return { start, end, dateKey };
}

/**
 * Returns the current 7-day count cycle window in Bangladesh time.
 * The cycle starts at a fixed weekly boundary (Monday 00:00 Asia/Dhaka by default)
 * and lasts 7 days, so all users share the same cycle start/end.
 */
export function getRewardCycleBounds(date: Date = new Date(), cycleStartDay: number = 1): DayBounds {
  const local = toDate(date, { timeZone: BANGLADESH_TZ });
  const year = local.getFullYear();
  const month = local.getMonth();
  const day = local.getDate();

  // dayOfWeek: 0 = Sunday ... 6 = Saturday (JavaScript convention)
  const dayOfWeek = new Date(year, month, day).getDay();
  const daysSinceCycleStart = (dayOfWeek - cycleStartDay + 7) % 7;

  const cycleStartLocal = new Date(year, month, day - daysSinceCycleStart, 0, 0, 0, 0);
  const cycleEndLocal = new Date(cycleStartLocal);
  cycleEndLocal.setDate(cycleStartLocal.getDate() + 7);

  const start = fromZonedTime(cycleStartLocal, BANGLADESH_TZ);
  const end = fromZonedTime(cycleEndLocal, BANGLADESH_TZ);

  const dateKey = `${cycleStartLocal.getFullYear()}-${String(cycleStartLocal.getMonth() + 1).padStart(2, '0')}-${String(cycleStartLocal.getDate()).padStart(2, '0')}`;

  return { start, end, dateKey };
}
