import { addDays, compareDates, diffDays, toDayNumber } from '../dates';
import type { FinancialSource, LocalDate, Minor, Transaction } from '../types';
import { PROVISIONAL } from './config';

export interface SourceBalance {
  sourceId: string;
  label: string;
  openingBalanceMinor: Minor;
  openingDate: LocalDate;
  inflowMinor: Minor;
  outflowMinor: Minor;
  balanceMinor: Minor;
  /** Records dated before the opening date; already reflected in the opening balance. */
  recordsBeforeOpening: number;
  /** Records dated after `asOf`; not counted yet. */
  futureRecords: number;
}

/**
 * Balance = opening balance + income − expenses dated on or after the opening date and on or before `asOf`.
 * Records before the opening date are history only, so an import of older activity cannot double-count.
 */
export function sourceBalance(source: FinancialSource, transactions: Transaction[], asOf: LocalDate): SourceBalance {
  let inflow = 0;
  let outflow = 0;
  let before = 0;
  let future = 0;
  for (const t of transactions) {
    if (t.sourceId !== source.id) continue;
    if (compareDates(t.date, source.openingDate) < 0) {
      before += 1;
      continue;
    }
    if (compareDates(t.date, asOf) > 0) {
      future += 1;
      continue;
    }
    if (t.direction === 'income') inflow += t.amountMinor;
    else outflow += t.amountMinor;
  }
  return {
    sourceId: source.id,
    label: source.label,
    openingBalanceMinor: source.openingBalanceMinor,
    openingDate: source.openingDate,
    inflowMinor: inflow,
    outflowMinor: outflow,
    balanceMinor: source.openingBalanceMinor + inflow - outflow,
    recordsBeforeOpening: before,
    futureRecords: future,
  };
}

export interface RecordedPosition {
  totalMinor: Minor;
  sources: SourceBalance[];
  asOf: LocalDate;
}

export function recordedPosition(sources: FinancialSource[], transactions: Transaction[], asOf: LocalDate): RecordedPosition {
  const balances = sources.filter((s) => !s.isArchived).map((s) => sourceBalance(s, transactions, asOf));
  return { totalMinor: balances.reduce((sum, b) => sum + b.balanceMinor, 0), sources: balances, asOf };
}

export interface CategoryTotal {
  categoryId: string;
  totalMinor: Minor;
  count: number;
}

export interface PeriodSummary {
  start: LocalDate;
  end: LocalDate;
  inflowMinor: Minor;
  outflowMinor: Minor;
  netMinor: Minor;
  count: number;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
}

/** Totals for records dated within [start, end] inclusive, optionally for one source. */
export function periodSummary(
  transactions: Transaction[],
  start: LocalDate,
  end: LocalDate,
  sourceId?: string,
): PeriodSummary {
  let inflow = 0;
  let outflow = 0;
  let count = 0;
  const expense = new Map<string, CategoryTotal>();
  const income = new Map<string, CategoryTotal>();
  for (const t of transactions) {
    if (sourceId && t.sourceId !== sourceId) continue;
    if (compareDates(t.date, start) < 0 || compareDates(t.date, end) > 0) continue;
    count += 1;
    const bucket = t.direction === 'income' ? income : expense;
    const entry = bucket.get(t.categoryId) ?? { categoryId: t.categoryId, totalMinor: 0, count: 0 };
    entry.totalMinor += t.amountMinor;
    entry.count += 1;
    bucket.set(t.categoryId, entry);
    if (t.direction === 'income') inflow += t.amountMinor;
    else outflow += t.amountMinor;
  }
  const sorted = (m: Map<string, CategoryTotal>) =>
    [...m.values()].sort((a, b) => b.totalMinor - a.totalMinor || a.categoryId.localeCompare(b.categoryId));
  return {
    start,
    end,
    inflowMinor: inflow,
    outflowMinor: outflow,
    netMinor: inflow - outflow,
    count,
    expenseByCategory: sorted(expense),
    incomeByCategory: sorted(income),
  };
}

export type CoverageLevel = 'none' | 'sparse' | 'partial' | 'good';

export interface Coverage {
  level: CoverageLevel;
  windowDays: number;
  activeDays: number;
  lastRecordDate: LocalDate | null;
  daysSinceLastRecord: number | null;
  isStale: boolean;
  totalRecords: number;
  /** Plain-language description of what the records cover. */
  description: string;
}

/** How much recent activity the user has recorded; gates estimates and warnings. */
export function coverage(transactions: Transaction[], today: LocalDate): Coverage {
  const { windowDays, minActiveDaysForPartial, minActiveDaysForGood, staleAfterDays } = PROVISIONAL.coverage;
  const windowStart = addDays(today, -(windowDays - 1));
  const activeDays = new Set<string>();
  let last: LocalDate | null = null;
  let total = 0;
  for (const t of transactions) {
    if (compareDates(t.date, today) > 0) continue;
    total += 1;
    if (last === null || compareDates(t.date, last) > 0) last = t.date;
    if (compareDates(t.date, windowStart) >= 0) activeDays.add(t.date);
  }
  const daysSince = last ? diffDays(today, last) : null;
  const isStale = daysSince !== null && daysSince >= staleAfterDays;
  let level: CoverageLevel = 'none';
  if (total > 0) {
    if (activeDays.size >= minActiveDaysForGood) level = 'good';
    else if (activeDays.size >= minActiveDaysForPartial) level = 'partial';
    else level = 'sparse';
  }
  let description: string;
  if (level === 'none') description = 'No records yet.';
  else
    description = `Records on ${activeDays.size} of the last ${windowDays} days${
      isStale ? `; latest record is ${daysSince} days old` : ''
    }.`;
  return {
    level,
    windowDays,
    activeDays: activeDays.size,
    lastRecordDate: last,
    daysSinceLastRecord: daysSince,
    isStale,
    totalRecords: total,
    description,
  };
}

export function dayRangeLength(start: LocalDate, end: LocalDate): number {
  return toDayNumber(end) - toDayNumber(start) + 1;
}
