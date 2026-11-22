import { addDays, compareDates, formatDate, startOfMonth, startOfWeek } from '../dates';
import { formatMoney as formatAmount, mulDiv } from '../money';
import type { Budget, Category, CurrencyCode, FinancialSource, InsightState, LocalDate, PlannedItem, Transaction } from '../types';
import { PROVISIONAL } from './config';
import { billCategoryIds, estimateSpendingRate, expandPlannedItems, projectCashFlow } from './projection';
import { coverage as computeCoverage, type Coverage, periodSummary, recordedPosition } from './summary';

export type Severity = 'urgent' | 'attention' | 'info';

export type NextStepAction = 'open_plan' | 'open_activity' | 'add_record' | 'open_simulator' | 'open_sources';

export interface EvidenceItem {
  label: string;
  value: string;
}

export interface Insight {
  fingerprint: string;
  ruleId: string;
  ruleVersion: string;
  severity: Severity;
  title: string;
  observation: string;
  period: { start: LocalDate; end: LocalDate };
  evidence: EvidenceItem[];
  dataBasis: string;
  caveat: string;
  ruleDescription: string;
  nextStep: { label: string; action: NextStepAction; categoryId?: string };
}

export interface SuppressedCheck {
  ruleId: string;
  title: string;
  reason: string;
}

export interface WarningInput {
  today: LocalDate;
  sources: FinancialSource[];
  transactions: Transaction[];
  plannedItems: PlannedItem[];
  budgets: Budget[];
  categories: Category[];
  bufferMinor: number;
  currency?: CurrencyCode;
}

export interface WarningResult {
  insights: Insight[];
  suppressed: SuppressedCheck[];
  coverage: Coverage;
}

const SEVERITY_ORDER: Record<Severity, number> = { urgent: 0, attention: 1, info: 2 };

export const RULES = {
  lowFunds: { id: 'low_projected_funds', version: '1.0.0' },
  billCluster: { id: 'bill_cluster', version: '1.0.0' },
  categorySpend: { id: 'category_spend_above_usual', version: '1.0.0' },
  budget: { id: 'budget_progress', version: '1.0.0' },
  stale: { id: 'records_out_of_date', version: '1.0.0' },
} as const;

function staleCaveat(c: Coverage): string {
  return c.isStale
    ? ` Your latest record is ${c.daysSinceLastRecord} days old, so this may not reflect what has happened since.`
    : '';
}

/** Runs every versioned rule against the user's records. Deterministic: no clock, network or randomness. */
export function evaluateWarnings(input: WarningInput): WarningResult {
  const { today, sources, transactions, plannedItems, budgets, categories, bufferMinor } = input;
  const shown = (minor: number) => formatAmount(minor, { currency: input.currency ?? 'GHS' });
  const cov = computeCoverage(transactions, today);
  const insights: Insight[] = [];
  const suppressed: SuppressedCheck[] = [];
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Uncategorised';
  const active = sources.filter((s) => !s.isArchived);
  const position = recordedPosition(sources, transactions, today);

  // Rule: low projected funds
  const lf = PROVISIONAL.warnings.lowFunds;
  if (active.length === 0) {
    suppressed.push({ ruleId: RULES.lowFunds.id, title: 'Low funds ahead', reason: 'Add a money source with a starting balance.' });
  } else if (cov.level === 'none' || cov.level === 'sparse') {
    suppressed.push({
      ruleId: RULES.lowFunds.id,
      title: 'Low funds ahead',
      reason: `Needs records on at least ${PROVISIONAL.coverage.minActiveDaysForPartial} of the last ${PROVISIONAL.coverage.windowDays} days. ${cov.description}`,
    });
  } else {
    const spending = estimateSpendingRate(transactions, today, billCategoryIds(plannedItems));
    const occ = expandPlannedItems(plannedItems, addDays(today, 1), addDays(today, lf.horizonDays));
    const proj = projectCashFlow({ today, horizonDays: lf.horizonDays, startBalanceMinor: position.totalMinor, occurrences: occ, spending });
    const centralBelow = proj.lowestCentral.valueMinor < bufferMinor;
    const lowBelow = proj.lowestLow.valueMinor < bufferMinor;
    if (centralBelow || lowBelow) {
      const severity: Severity = proj.lowestCentral.valueMinor < 0 ? 'urgent' : centralBelow ? 'attention' : 'info';
      const point = centralBelow ? proj.lowestCentral : proj.lowestLow;
      const nextIncome = occ.find((o) => o.direction === 'income');
      insights.push({
        fingerprint: `${RULES.lowFunds.id}@${RULES.lowFunds.version}:${severity}:${point.date}`,
        ruleId: RULES.lowFunds.id,
        ruleVersion: RULES.lowFunds.version,
        severity,
        title: severity === 'info' ? 'Money could get tight' : 'Possible cash shortfall ahead',
        observation: centralBelow
          ? `Based on the records you entered, your available money may drop to ${shown(point.valueMinor)} around ${formatDate(point.date)}${
              bufferMinor > 0 ? `, below the ${shown(bufferMinor)} buffer you set` : ''
            }.`
          : `If spending runs higher than usual and expected income does not arrive, your available money may drop to ${shown(point.valueMinor)} around ${formatDate(point.date)}.`,
        period: { start: today, end: addDays(today, lf.horizonDays) },
        evidence: [
          { label: 'Recorded balance today', value: shown(position.totalMinor) },
          { label: 'Bills entered in next 30 days', value: shown(occ.filter((o) => o.direction === 'expense').reduce((s, o) => s + o.amountMinor, 0)) },
          { label: 'Expected income entered', value: shown(occ.filter((o) => o.direction === 'income').reduce((s, o) => s + o.amountMinor, 0)) },
          {
            label: 'Estimated everyday spending',
            value: spending ? `${shown(spending.medianWeeklyMinor)} a week (typical)` : 'Not included — not enough recorded weeks',
          },
          { label: 'Lowest estimate', value: `${shown(point.valueMinor)} on ${formatDate(point.date)}` },
          ...(nextIncome ? [{ label: 'Next expected income', value: `${nextIncome.label}, ${formatDate(nextIncome.date)}` }] : []),
        ],
        dataBasis: cov.description,
        caveat: `This is an estimate, not a prediction. It only knows the records and plans you entered.${staleCaveat(cov)}`,
        ruleDescription: `Projects your recorded balance forward ${lf.horizonDays} days using bills and expected income you entered and your typical weekly spending, then checks whether it drops below your buffer (${shown(bufferMinor)}).`,
        nextStep: { label: 'Try a plan in the simulator', action: 'open_simulator' },
      });
    }
  }

  // Rule: several bills close together
  const bc = PROVISIONAL.warnings.billCluster;
  const windowEnd = addDays(today, bc.windowDays);
  const soonBills = expandPlannedItems(plannedItems, today, windowEnd).filter((o) => o.direction === 'expense');
  if (soonBills.length >= bc.minBills && active.length > 0) {
    const total = soonBills.reduce((s, o) => s + o.amountMinor, 0);
    const threshold = mulDiv(Math.max(position.totalMinor, 0), bc.shareOfBalancePercent, 100);
    if (total >= threshold) {
      const severity: Severity = total > position.totalMinor ? 'attention' : 'info';
      insights.push({
        fingerprint: `${RULES.billCluster.id}@${RULES.billCluster.version}:${soonBills.map((b) => b.key).join(',')}`,
        ruleId: RULES.billCluster.id,
        ruleVersion: RULES.billCluster.version,
        severity,
        title: `${soonBills.length} bills due within ${bc.windowDays} days`,
        observation: `Bills you entered add up to ${shown(total)} by ${formatDate(windowEnd)}. That is ${
          total > position.totalMinor ? 'more than' : `at least ${bc.shareOfBalancePercent}% of`
        } your recorded balance of ${shown(position.totalMinor)}.`,
        period: { start: today, end: windowEnd },
        evidence: soonBills.map((b) => ({ label: `${b.label} · ${formatDate(b.date)}`, value: shown(b.amountMinor) })),
        dataBasis: `Bills you entered in Plan, and your recorded balance as of ${formatDate(today)}.`,
        caveat: `Safey cannot see bills you have not entered, or whether a bill was already paid.${staleCaveat(cov)}`,
        ruleDescription: `Shows when ${bc.minBills} or more entered bills fall within ${bc.windowDays} days and together reach ${bc.shareOfBalancePercent}% or more of your recorded balance.`,
        nextStep: { label: 'Review your bills', action: 'open_plan' },
      });
    }
  }

  // Rule: category spending higher than the user's own recent weeks
  const cs = PROVISIONAL.warnings.categorySpend;
  const recentStart = addDays(today, -6);
  const priorWeeks: { start: LocalDate; end: LocalDate }[] = [];
  for (let w = 1; w <= PROVISIONAL.spending.historyWeeks; w++) {
    const end = addDays(recentStart, -1 - 7 * (w - 1));
    const start = addDays(end, -6);
    if (transactions.some((t) => compareDates(t.date, start) >= 0 && compareDates(t.date, end) <= 0)) priorWeeks.push({ start, end });
  }
  if (priorWeeks.length < cs.minPriorWeeks) {
    suppressed.push({
      ruleId: RULES.categorySpend.id,
      title: 'Spending higher than usual',
      reason: `Needs at least ${cs.minPriorWeeks} earlier weeks with records to compare against. You have ${priorWeeks.length}.`,
    });
  } else {
    const recent = periodSummary(transactions, recentStart, today);
    for (const cat of recent.expenseByCategory) {
      const weekly = priorWeeks
        .map((w) => periodSummary(transactions, w.start, w.end).expenseByCategory.find((c) => c.categoryId === cat.categoryId)?.totalMinor ?? 0)
        .sort((a, b) => a - b);
      const median = weekly[Math.max(0, Math.ceil(weekly.length / 2) - 1)];
      if (median <= 0) continue;
      if (cat.totalMinor * 100 < median * cs.ratioPercent) continue;
      if (cat.totalMinor - median < cs.minDifferenceMinor) continue;
      const name = catName(cat.categoryId);
      insights.push({
        fingerprint: `${RULES.categorySpend.id}@${RULES.categorySpend.version}:${cat.categoryId}:${recentStart}`,
        ruleId: RULES.categorySpend.id,
        ruleVersion: RULES.categorySpend.version,
        severity: 'info',
        title: `${name} is higher than your recent weeks`,
        observation: `Your records show ${shown(cat.totalMinor)} on ${name.toLowerCase()} in the last 7 days. Your typical week is ${shown(median)}.`,
        period: { start: recentStart, end: today },
        evidence: [
          { label: 'Last 7 days', value: shown(cat.totalMinor) },
          { label: `Typical week (median of ${weekly.length})`, value: shown(median) },
          { label: 'Records in last 7 days', value: String(cat.count) },
        ],
        dataBasis: `Compared with ${priorWeeks.length} earlier weeks that have records.`,
        caveat: `A busy week is not a problem on its own. If a record is wrong or in the wrong category, fix it and this will update.${staleCaveat(cov)}`,
        ruleDescription: `Shows when one category's last 7 days is at least ${cs.ratioPercent / 100}× its typical week and at least ${shown(cs.minDifferenceMinor)} more.`,
        nextStep: { label: 'Check these records', action: 'open_activity', categoryId: cat.categoryId },
      });
    }
  }

  // Rule: budget progress
  for (const b of budgets) {
    const start = b.period === 'week' ? startOfWeek(today) : startOfMonth(today);
    const spent = periodSummary(transactions, start, today).expenseByCategory.find((c) => c.categoryId === b.categoryId)?.totalMinor ?? 0;
    const pct = b.limitMinor > 0 ? Math.floor((spent * 100) / b.limitMinor) : 0;
    if (pct < PROVISIONAL.warnings.budget.nearLimitPercent) continue;
    const name = catName(b.categoryId);
    const over = spent > b.limitMinor;
    insights.push({
      fingerprint: `${RULES.budget.id}@${RULES.budget.version}:${b.id}:${start}:${over ? 'over' : 'near'}`,
      ruleId: RULES.budget.id,
      ruleVersion: RULES.budget.version,
      severity: over ? 'attention' : 'info',
      title: over ? `${name} is past your ${b.period}ly budget` : `${name} is at ${pct}% of your budget`,
      observation: `Your records show ${shown(spent)} of the ${shown(b.limitMinor)} you planned for ${name.toLowerCase()} this ${b.period}.`,
      period: { start, end: today },
      evidence: [
        { label: 'Recorded this ' + b.period, value: shown(spent) },
        { label: 'Budget', value: shown(b.limitMinor) },
        { label: 'Used', value: `${pct}%` },
      ],
      dataBasis: `Records dated ${formatDate(start)} to ${formatDate(today)}.`,
      caveat: `Budgets are your own plan, not a rule. Adjust the budget if it no longer fits.${staleCaveat(cov)}`,
      ruleDescription: `Shows when recorded spending reaches ${PROVISIONAL.warnings.budget.nearLimitPercent}% of a budget you set.`,
      nextStep: { label: 'Review budget', action: 'open_plan' },
    });
  }

  // Rule: records out of date
  if (active.length > 0 && cov.lastRecordDate && cov.daysSinceLastRecord !== null && cov.daysSinceLastRecord >= PROVISIONAL.warnings.stale.afterDays) {
    insights.push({
      fingerprint: `${RULES.stale.id}@${RULES.stale.version}:${cov.lastRecordDate}`,
      ruleId: RULES.stale.id,
      ruleVersion: RULES.stale.version,
      severity: 'info',
      title: 'Your picture may be out of date',
      observation: `Your latest record is from ${formatDate(cov.lastRecordDate)}, ${cov.daysSinceLastRecord} days ago. Estimates and checks are less reliable until recent activity is added.`,
      period: { start: cov.lastRecordDate, end: today },
      evidence: [
        { label: 'Latest record', value: formatDate(cov.lastRecordDate) },
        { label: 'Days since', value: String(cov.daysSinceLastRecord) },
      ],
      dataBasis: cov.description,
      caveat: 'A quiet period is fine. This only means Safey has less to go on.',
      ruleDescription: `Shows when there are no records for ${PROVISIONAL.warnings.stale.afterDays} days or more.`,
      nextStep: { label: 'Add a record', action: 'add_record' },
    });
  }

  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || compareDates(b.period.start, a.period.start));
  return { insights, suppressed, coverage: cov };
}

/** Hides insights the user dismissed, or snoozed until a later date. A changed fingerprint shows again. */
export function visibleInsights(insights: Insight[], states: InsightState[], today: LocalDate): Insight[] {
  return insights.filter((i) => {
    const s = states.find((x) => x.fingerprint === i.fingerprint);
    if (!s) return true;
    if (s.status === 'dismissed') return false;
    return s.snoozedUntil !== null && compareDates(today, s.snoozedUntil) >= 0;
  });
}
