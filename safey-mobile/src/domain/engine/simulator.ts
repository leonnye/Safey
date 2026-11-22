import { addDays, addMonths, compareDates, diffDays } from '../dates';
import type { LocalDate, Minor, PlannedItem, ScenarioInputs, Transaction } from '../types';
import { ENGINE_VERSION } from './config';
import {
  billCategoryIds,
  estimateSpendingRate,
  expandPlannedItems,
  type PlannedOccurrence,
  type Projection,
  projectCashFlow,
  sortOccurrences,
} from './projection';

export const TEMPLATE_LABELS: Record<ScenarioInputs['template'], string> = {
  delayed_income: 'Income arrives later',
  one_off_expense: 'One-off expense',
  recurring_savings: 'Set aside savings',
  custom_change: 'Custom change',
};

export interface SimulationInput {
  today: LocalDate;
  horizonDays: number;
  startBalanceMinor: Minor;
  plannedItems: PlannedItem[];
  transactions: Transaction[];
  scenario: ScenarioInputs;
}

export interface SimulationResult {
  engineVersion: string;
  baseline: Projection;
  scenario: Projection;
  differenceAtEndMinor: Minor;
  scenarioAssumptions: string[];
  error: string | null;
}

function repeatEvents(
  key: string,
  label: string,
  direction: 'income' | 'expense',
  amountMinor: Minor,
  start: LocalDate,
  frequency: 'once' | 'weekly' | 'monthly',
  until: LocalDate,
): PlannedOccurrence[] {
  const out: PlannedOccurrence[] = [];
  let date = start;
  let i = 0;
  while (compareDates(date, until) <= 0 && i < 1000) {
    out.push({ key: `${key}:${date}`, itemId: null, label, direction, amountMinor, date });
    if (frequency === 'once') break;
    i += 1;
    date = frequency === 'weekly' ? addDays(start, 7 * i) : addMonths(start, i);
  }
  return out;
}

/** Applies a scenario to baseline occurrences. Pure; returns the modified list and plain-language assumptions. */
export function applyScenario(
  baseline: PlannedOccurrence[],
  scenario: ScenarioInputs,
  today: LocalDate,
  horizonEnd: LocalDate,
): { occurrences: PlannedOccurrence[]; assumptions: string[]; error: string | null } {
  switch (scenario.template) {
    case 'delayed_income': {
      const next = baseline.find(
        (o) => o.itemId === scenario.plannedItemId && o.direction === 'income' && compareDates(o.date, today) > 0,
      );
      if (!next) {
        return { occurrences: baseline, assumptions: [], error: 'That expected income has no date inside this period.' };
      }
      const moved = { ...next, key: `${next.key}:delayed`, date: addDays(next.date, scenario.delayDays) };
      return {
        occurrences: sortOccurrences([...baseline.filter((o) => o.key !== next.key), moved]),
        assumptions: [`“${next.label}” arrives ${scenario.delayDays} days later, on ${moved.date} instead of ${next.date}.`],
        error: null,
      };
    }
    case 'one_off_expense':
      return {
        occurrences: sortOccurrences([
          ...baseline,
          ...repeatEvents('scenario-oneoff', scenario.label || 'One-off expense', 'expense', scenario.amountMinor, scenario.date, 'once', horizonEnd),
        ]),
        assumptions: [`A one-off expense on ${scenario.date}.`],
        error: null,
      };
    case 'recurring_savings':
      return {
        occurrences: sortOccurrences([
          ...baseline,
          ...repeatEvents('scenario-savings', 'Savings set aside', 'expense', scenario.amountMinor, scenario.startDate, scenario.frequency, horizonEnd),
        ]),
        assumptions: [
          `Money set aside ${scenario.frequency === 'weekly' ? 'every week' : 'every month'} from ${scenario.startDate} is treated as no longer available to spend.`,
        ],
        error: null,
      };
    case 'custom_change':
      return {
        occurrences: sortOccurrences([
          ...baseline,
          ...repeatEvents(
            'scenario-custom',
            scenario.label || 'Custom change',
            scenario.direction,
            scenario.amountMinor,
            scenario.startDate,
            scenario.frequency,
            horizonEnd,
          ),
        ]),
        assumptions: [
          `${scenario.direction === 'income' ? 'Extra money in' : 'Extra money out'} from ${scenario.startDate}${
            scenario.frequency === 'once' ? ', once' : scenario.frequency === 'weekly' ? ', every week' : ', every month'
          }.`,
        ],
        error: null,
      };
  }
}

export function validateScenario(s: ScenarioInputs, today: LocalDate, horizonDays: number): string | null {
  const end = addDays(today, horizonDays);
  const inWindow = (d: LocalDate) => diffDays(d, today) >= 1 && compareDates(d, end) <= 0;
  switch (s.template) {
    case 'delayed_income':
      if (!s.plannedItemId) return 'Choose an expected income item.';
      if (!Number.isInteger(s.delayDays) || s.delayDays < 1 || s.delayDays > 120) return 'Delay must be 1 to 120 days.';
      return null;
    case 'one_off_expense':
      if (!inWindow(s.date)) return 'Choose a date after today and inside the period.';
      return s.amountMinor > 0 ? null : 'Enter an amount above zero.';
    case 'recurring_savings':
    case 'custom_change':
      if (!inWindow(s.startDate)) return 'Choose a start date after today and inside the period.';
      return s.amountMinor > 0 ? null : 'Enter an amount above zero.';
  }
}

/** Deterministic baseline vs scenario comparison. Same inputs always produce the same output. */
export function simulate(input: SimulationInput): SimulationResult {
  const { today, horizonDays, startBalanceMinor, plannedItems, transactions, scenario } = input;
  const horizonEnd = addDays(today, horizonDays);
  const spending = estimateSpendingRate(transactions, today, billCategoryIds(plannedItems));
  const baselineOcc = expandPlannedItems(plannedItems, addDays(today, 1), addDays(horizonEnd, 120));
  const baseline = projectCashFlow({ today, horizonDays, startBalanceMinor, occurrences: baselineOcc, spending });
  const validation = validateScenario(scenario, today, horizonDays);
  const applied = validation
    ? { occurrences: baselineOcc, assumptions: [], error: validation }
    : applyScenario(baselineOcc, scenario, today, horizonEnd);
  const projected = projectCashFlow({ today, horizonDays, startBalanceMinor, occurrences: applied.occurrences, spending });
  return {
    engineVersion: ENGINE_VERSION,
    baseline,
    scenario: projected,
    differenceAtEndMinor: projected.end.centralMinor - baseline.end.centralMinor,
    scenarioAssumptions: applied.assumptions,
    error: applied.error,
  };
}
