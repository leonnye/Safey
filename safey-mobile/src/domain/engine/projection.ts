import { addDays, addMonths, compareDates, diffDays } from '../dates';
import { mulDiv } from '../money';
import type { Direction, LocalDate, Minor, PlannedItem, Transaction } from '../types';
import { ENGINE_VERSION, PROVISIONAL } from './config';

export interface PlannedOccurrence {
  key: string;
  itemId: string | null;
  label: string;
  direction: Direction;
  amountMinor: Minor;
  date: LocalDate;
}

/** Expands active planned items into dated occurrences within [from, to] inclusive. */
export function expandPlannedItems(items: PlannedItem[], from: LocalDate, to: LocalDate): PlannedOccurrence[] {
  const out: PlannedOccurrence[] = [];
  for (const item of items) {
    if (!item.isActive) continue;
    let date = item.dueDate;
    let index = 0;
    let guard = 0;
    while (compareDates(date, to) <= 0 && guard < 1000) {
      if (compareDates(date, from) >= 0) {
        out.push({
          key: `${item.id}:${date}`,
          itemId: item.id,
          label: item.label,
          direction: item.direction,
          amountMinor: item.amountMinor,
          date,
        });
      }
      if (item.frequency === 'once') break;
      index += 1;
      date = item.frequency === 'weekly' ? addDays(item.dueDate, 7 * index) : addMonths(item.dueDate, index);
      guard += 1;
    }
  }
  return sortOccurrences(out);
}

export function sortOccurrences(list: PlannedOccurrence[]): PlannedOccurrence[] {
  return [...list].sort((a, b) => compareDates(a.date, b.date) || a.key.localeCompare(b.key));
}

export interface SpendingRate {
  /** Weekly spending at the 25th, 50th and 75th percentile of recorded weeks. */
  lowWeeklyMinor: Minor;
  medianWeeklyMinor: Minor;
  highWeeklyMinor: Minor;
  weeksUsed: number;
  weeksConsidered: number;
  excludedCategoryIds: string[];
}

function nearestRank(sorted: number[], percent: number): number {
  const rank = Math.max(1, Math.ceil((percent / 100) * sorted.length));
  return sorted[rank - 1];
}

/**
 * Estimates everyday spending from the user's own recent weeks.
 * Weeks with no records at all are skipped because a quiet week and an unrecorded week look the same.
 * Expenses in categories linked to planned bills are excluded so bills are not counted twice.
 * Returns null when too few recorded weeks exist.
 */
export function estimateSpendingRate(
  transactions: Transaction[],
  today: LocalDate,
  excludedCategoryIds: string[] = [],
): SpendingRate | null {
  const { historyWeeks, minRecordedWeeksForRate } = PROVISIONAL.spending;
  const excluded = new Set(excludedCategoryIds);
  const totals: number[] = [];
  for (let w = 0; w < historyWeeks; w++) {
    const end = addDays(today, -1 - 7 * w);
    const start = addDays(end, -6);
    let recorded = false;
    let spend = 0;
    for (const t of transactions) {
      if (compareDates(t.date, start) < 0 || compareDates(t.date, end) > 0) continue;
      recorded = true;
      if (t.direction === 'expense' && !excluded.has(t.categoryId)) spend += t.amountMinor;
    }
    if (recorded) totals.push(spend);
  }
  if (totals.length < minRecordedWeeksForRate) return null;
  const sorted = [...totals].sort((a, b) => a - b);
  return {
    lowWeeklyMinor: nearestRank(sorted, 25),
    medianWeeklyMinor: nearestRank(sorted, 50),
    highWeeklyMinor: nearestRank(sorted, 75),
    weeksUsed: totals.length,
    weeksConsidered: historyWeeks,
    excludedCategoryIds: [...excluded].sort(),
  };
}

export interface ProjectionPoint {
  date: LocalDate;
  centralMinor: Minor;
  lowMinor: Minor;
  highMinor: Minor;
}

export interface Projection {
  engineVersion: string;
  startDate: LocalDate;
  horizonDays: number;
  startBalanceMinor: Minor;
  points: ProjectionPoint[];
  occurrences: PlannedOccurrence[];
  spending: SpendingRate | null;
  lowestCentral: { date: LocalDate; valueMinor: Minor };
  lowestLow: { date: LocalDate; valueMinor: Minor };
  end: ProjectionPoint;
  assumptions: string[];
}

export interface ProjectionInput {
  today: LocalDate;
  horizonDays: number;
  startBalanceMinor: Minor;
  occurrences: PlannedOccurrence[];
  spending: SpendingRate | null;
}

/**
 * Day-by-day estimate from the recorded balance.
 * Central: median spending, expected income arrives. High: lower spending, expected income arrives.
 * Low: higher spending and expected income does not arrive. Bills are applied in every band.
 */
export function projectCashFlow(input: ProjectionInput): Projection {
  const { today, horizonDays, startBalanceMinor, occurrences, spending } = input;
  const byDate = new Map<LocalDate, PlannedOccurrence[]>();
  for (const o of occurrences) {
    const offset = diffDays(o.date, today);
    if (offset < 1 || offset > horizonDays) continue;
    byDate.set(o.date, [...(byDate.get(o.date) ?? []), o]);
  }
  let billsCum = 0;
  let incomeCum = 0;
  const points: ProjectionPoint[] = [
    { date: today, centralMinor: startBalanceMinor, lowMinor: startBalanceMinor, highMinor: startBalanceMinor },
  ];
  for (let k = 1; k <= horizonDays; k++) {
    const date = addDays(today, k);
    for (const o of byDate.get(date) ?? []) {
      if (o.direction === 'expense') billsCum += o.amountMinor;
      else incomeCum += o.amountMinor;
    }
    const spendLow = spending ? mulDiv(spending.lowWeeklyMinor, k, 7) : 0;
    const spendMid = spending ? mulDiv(spending.medianWeeklyMinor, k, 7) : 0;
    const spendHigh = spending ? mulDiv(spending.highWeeklyMinor, k, 7) : 0;
    points.push({
      date,
      centralMinor: startBalanceMinor + incomeCum - billsCum - spendMid,
      highMinor: startBalanceMinor + incomeCum - billsCum - spendLow,
      lowMinor: startBalanceMinor - billsCum - spendHigh,
    });
  }
  const lowestBy = (pick: (p: ProjectionPoint) => Minor) =>
    points.reduce(
      (min, p) => (pick(p) < min.valueMinor ? { date: p.date, valueMinor: pick(p) } : min),
      { date: points[0].date, valueMinor: pick(points[0]) },
    );
  const used = occurrences.filter((o) => {
    const offset = diffDays(o.date, today);
    return offset >= 1 && offset <= horizonDays;
  });
  const assumptions = [
    `Starts from your recorded balance on ${today}.`,
    `Covers the next ${horizonDays} days.`,
    used.length
      ? `Includes ${used.length} planned item${used.length === 1 ? '' : 's'} you entered (bills and expected income).`
      : 'No planned bills or expected income are entered for this period.',
    spending
      ? `Everyday spending is estimated from ${spending.weeksUsed} recorded week${spending.weeksUsed === 1 ? '' : 's'} out of the last ${spending.weeksConsidered}.`
      : 'Everyday spending is not included because there are not enough recorded weeks yet.',
    'The lower line assumes higher spending and that expected income does not arrive.',
    'Income you have not entered as expected is not assumed.',
  ];
  return {
    engineVersion: ENGINE_VERSION,
    startDate: today,
    horizonDays,
    startBalanceMinor,
    points,
    occurrences: used,
    spending,
    lowestCentral: lowestBy((p) => p.centralMinor),
    lowestLow: lowestBy((p) => p.lowMinor),
    end: points[points.length - 1],
    assumptions,
  };
}

/** Category ids linked to active planned bills; their past expenses are left out of the spending estimate. */
export function billCategoryIds(items: PlannedItem[]): string[] {
  const ids = new Set<string>();
  for (const i of items) if (i.isActive && i.direction === 'expense' && i.categoryId) ids.add(i.categoryId);
  return [...ids];
}
