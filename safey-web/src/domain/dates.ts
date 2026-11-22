import type { LocalDate } from './types';

export const DEFAULT_TIMEZONE = 'Africa/Accra';

const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Days since 1970-01-01 for a calendar date; timezone-free arithmetic. */
export function toDayNumber(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNumber(day: number): LocalDate {
  const dt = new Date(day * MS_PER_DAY);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromDayNumber(toDayNumber(date) + days);
}

export function diffDays(later: LocalDate, earlier: LocalDate): number {
  return toDayNumber(later) - toDayNumber(earlier);
}

/** Adds calendar months, clamping to the last day of shorter months (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: LocalDate, months: number): LocalDate {
  const [y, m, d] = date.split('-').map(Number);
  const targetMonthIndex = m - 1 + months;
  const ty = y + Math.floor(targetMonthIndex / 12);
  const tm = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

export function startOfMonth(date: LocalDate): LocalDate {
  return `${date.slice(0, 7)}-01`;
}

/** Monday-based week start. */
export function startOfWeek(date: LocalDate): LocalDate {
  const day = toDayNumber(date);
  const weekday = new Date(day * MS_PER_DAY).getUTCDay();
  const offset = (weekday + 6) % 7;
  return fromDayNumber(day - offset);
}

/** Current calendar date in `timezone`, read from the device clock. Not used by the engine. */
export function todayIn(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): LocalDate {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const value = `${get('year')}-${get('month')}-${get('day')}`;
    if (isLocalDate(value)) return value;
  } catch {
    // Fall through to UTC when the runtime lacks timezone data; Africa/Accra is UTC+0.
  }
  return now.toISOString().slice(0, 10);
}

/** `12 May 2026` */
export function formatDate(date: LocalDate): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** `Tue 12 May` */
export function formatShortDate(date: LocalDate): string {
  const [, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(toDayNumber(date) * MS_PER_DAY).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]}`;
}

export function formatMonth(date: LocalDate): string {
  const [y, m] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
