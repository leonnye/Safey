import { describe, expect, it } from 'vitest';
import { addDays } from '../dates';
import { estimateSpendingRate, expandPlannedItems, projectCashFlow } from '../engine/projection';
import { simulate } from '../engine/simulator';
import { coverage, periodSummary, recordedPosition, sourceBalance } from '../engine/summary';
import { evaluateWarnings, visibleInsights } from '../engine/warnings';
import { bill, cash, categories, dailySpending, TODAY, txn } from './fixtures';

describe('balances', () => {
  it('adds activity on or after the opening date and ignores earlier history', () => {
    const t = [
      txn({ date: '2026-08-20', amountMinor: 99_999, direction: 'expense' }),
      txn({ date: '2026-09-01', amountMinor: 20_000, direction: 'income' }),
      txn({ date: '2026-09-02', amountMinor: 5_000, direction: 'expense' }),
      txn({ date: '2026-11-15', amountMinor: 1_000, direction: 'expense' }),
    ];
    const b = sourceBalance(cash, t, TODAY);
    expect(b.balanceMinor).toBe(100_000 + 20_000 - 5_000);
    expect(b.recordsBeforeOpening).toBe(1);
    expect(b.futureRecords).toBe(1);
  });

  it('excludes archived sources from the total', () => {
    const archived = { ...cash, id: 'src-old', isArchived: true };
    expect(recordedPosition([cash, archived], [], TODAY).totalMinor).toBe(100_000);
  });

  it('conserves money: inflow − outflow equals net for any period', () => {
    const t = [...dailySpending(20), txn({ date: addDays(TODAY, -3), amountMinor: 70_000, direction: 'income' })];
    const s = periodSummary(t, addDays(TODAY, -30), TODAY);
    expect(s.netMinor).toBe(s.inflowMinor - s.outflowMinor);
    expect(s.expenseByCategory.reduce((a, c) => a + c.totalMinor, 0)).toBe(s.outflowMinor);
  });
});

describe('coverage', () => {
  it('grades recorded days in the last 30', () => {
    expect(coverage([], TODAY).level).toBe('none');
    expect(coverage(dailySpending(2), TODAY).level).toBe('sparse');
    expect(coverage(dailySpending(5), TODAY).level).toBe('partial');
    expect(coverage(dailySpending(12), TODAY).level).toBe('good');
  });
  it('flags stale records', () => {
    const c = coverage([txn({ date: addDays(TODAY, -20), amountMinor: 100, direction: 'expense' })], TODAY);
    expect(c.isStale).toBe(true);
    expect(c.daysSinceLastRecord).toBe(20);
  });
});

describe('planned items', () => {
  it('expands weekly and monthly repeats within the window', () => {
    const weekly = bill({ dueDate: '2026-10-20', amountMinor: 1_000, frequency: 'weekly' });
    const monthly = bill({ dueDate: '2026-01-31', amountMinor: 2_000, frequency: 'monthly' });
    const occ = expandPlannedItems([weekly, monthly], '2026-10-31', '2026-11-30');
    expect(occ.filter((o) => o.itemId === weekly.id).map((o) => o.date)).toEqual(['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24']);
    expect(occ.filter((o) => o.itemId === monthly.id).map((o) => o.date)).toEqual(['2026-10-31', '2026-11-30']);
  });
});

describe('spending estimate', () => {
  it('needs enough recorded weeks', () => {
    expect(estimateSpendingRate(dailySpending(10), TODAY)).toBeNull();
    const r = estimateSpendingRate(dailySpending(56), TODAY);
    expect(r?.medianWeeklyMinor).toBe(35_000);
    expect(r?.weeksUsed).toBe(8);
  });
  it('leaves out bill categories to avoid double counting', () => {
    const t = [...dailySpending(28), ...[1, 8, 15, 22].map((d) => txn({ date: addDays(TODAY, -d), amountMinor: 50_000, direction: 'expense', categoryId: 'sys-rent-housing' }))];
    expect(estimateSpendingRate(t, TODAY, ['sys-rent-housing'])?.medianWeeklyMinor).toBe(35_000);
  });
});

describe('projection', () => {
  it('orders bands low ≤ central ≤ high on every day', () => {
    const t = [...dailySpending(40, 3_000), ...dailySpending(10, 9_000)];
    const spending = estimateSpendingRate(t, TODAY);
    const occ = expandPlannedItems(
      [bill({ dueDate: addDays(TODAY, 5), amountMinor: 30_000 }), bill({ dueDate: addDays(TODAY, 9), amountMinor: 50_000, direction: 'income', label: 'Client payment' })],
      addDays(TODAY, 1),
      addDays(TODAY, 30),
    );
    const p = projectCashFlow({ today: TODAY, horizonDays: 30, startBalanceMinor: 200_000, occurrences: occ, spending });
    expect(p.points).toHaveLength(31);
    for (const pt of p.points) {
      expect(pt.lowMinor).toBeLessThanOrEqual(pt.centralMinor);
      expect(pt.centralMinor).toBeLessThanOrEqual(pt.highMinor);
      expect(Number.isInteger(pt.centralMinor)).toBe(true);
    }
  });
});

describe('simulator', () => {
  const base = {
    today: TODAY,
    horizonDays: 30,
    startBalanceMinor: 150_000,
    transactions: dailySpending(56, 2_000),
  };

  it('is deterministic', () => {
    const input = { ...base, plannedItems: [], scenario: { template: 'one_off_expense' as const, amountMinor: 40_000, date: addDays(TODAY, 3), label: 'Phone repair' } };
    expect(simulate(input)).toEqual(simulate(input));
  });

  it('a one-off expense lowers the end balance by exactly its amount', () => {
    const r = simulate({ ...base, plannedItems: [], scenario: { template: 'one_off_expense', amountMinor: 40_000, date: addDays(TODAY, 3), label: '' } });
    expect(r.error).toBeNull();
    expect(r.differenceAtEndMinor).toBe(-40_000);
  });

  it('weekly savings over 30 days sets aside 5 payments starting tomorrow', () => {
    const r = simulate({ ...base, plannedItems: [], scenario: { template: 'recurring_savings', amountMinor: 10_000, startDate: addDays(TODAY, 1), frequency: 'weekly' } });
    expect(r.differenceAtEndMinor).toBe(-50_000);
  });

  it('delayed income moves out of the window and lowers the low point', () => {
    const income = bill({ id: 'pay', label: 'Client payment', direction: 'income', dueDate: addDays(TODAY, 25), amountMinor: 80_000, categoryId: null });
    const r = simulate({ ...base, plannedItems: [income], scenario: { template: 'delayed_income', plannedItemId: 'pay', delayDays: 10 } });
    expect(r.differenceAtEndMinor).toBe(-80_000);
    expect(r.scenarioAssumptions[0]).toContain('10 days later');
  });

  it('reports validation errors instead of computing a scenario', () => {
    const r = simulate({ ...base, plannedItems: [], scenario: { template: 'one_off_expense', amountMinor: 1_000, date: TODAY, label: '' } });
    expect(r.error).not.toBeNull();
    expect(r.differenceAtEndMinor).toBe(0);
  });
});

describe('warnings', () => {
  const common = { today: TODAY, budgets: [], categories, bufferMinor: 0 };

  it('suppresses projection warnings when records are sparse', () => {
    const r = evaluateWarnings({ ...common, sources: [{ ...cash, openingBalanceMinor: 100 }], transactions: dailySpending(2), plannedItems: [bill({ dueDate: addDays(TODAY, 3), amountMinor: 500_000 })] });
    expect(r.insights.some((i) => i.ruleId === 'low_projected_funds')).toBe(false);
    expect(r.suppressed.some((s) => s.ruleId === 'low_projected_funds')).toBe(true);
  });

  it('flags a projected shortfall with evidence and a versioned rule', () => {
    const r = evaluateWarnings({
      ...common,
      sources: [{ ...cash, openingDate: '2026-10-01', openingBalanceMinor: 60_000 }],
      transactions: dailySpending(29, 1_000),
      plannedItems: [bill({ dueDate: addDays(TODAY, 4), amountMinor: 80_000 })],
    });
    const w = r.insights.find((i) => i.ruleId === 'low_projected_funds');
    expect(w?.severity).toBe('urgent');
    expect(w?.ruleVersion).toBe('1.0.0');
    expect(w?.evidence.length).toBeGreaterThan(3);
    expect(w?.observation).toContain('Based on the records you entered');
  });

  it('flags bills close together relative to balance', () => {
    const r = evaluateWarnings({
      ...common,
      sources: [cash],
      transactions: [],
      plannedItems: [bill({ dueDate: addDays(TODAY, 2), amountMinor: 40_000 }), bill({ label: 'Electricity', dueDate: addDays(TODAY, 5), amountMinor: 30_000 })],
    });
    expect(r.insights.find((i) => i.ruleId === 'bill_cluster')?.evidence).toHaveLength(2);
  });

  it('flags category spending well above the user’s own typical week', () => {
    const history = dailySpending(56, 2_000);
    const spike = [1, 2, 3].map((d) => txn({ date: addDays(TODAY, -d), amountMinor: 10_000, direction: 'expense', categoryId: 'sys-transport' }));
    const typical = [8, 15, 22, 29, 36].map((d) => txn({ date: addDays(TODAY, -d), amountMinor: 2_000, direction: 'expense', categoryId: 'sys-transport' }));
    const r = evaluateWarnings({ ...common, sources: [cash], transactions: [...history, ...spike, ...typical], plannedItems: [] });
    const w = r.insights.find((i) => i.ruleId === 'category_spend_above_usual');
    expect(w?.title).toContain('Transport');
  });

  it('dismissed insights stay hidden; snoozed ones return on the snooze date', () => {
    const r = evaluateWarnings({ ...common, sources: [cash], transactions: [txn({ date: addDays(TODAY, -30), amountMinor: 100, direction: 'expense' })], plannedItems: [] });
    const stale = r.insights.find((i) => i.ruleId === 'records_out_of_date')!;
    expect(stale).toBeDefined();
    const dismissed = [{ fingerprint: stale.fingerprint, status: 'dismissed' as const, snoozedUntil: null, updatedAt: '' }];
    expect(visibleInsights([stale], dismissed, TODAY)).toHaveLength(0);
    const snoozed = [{ fingerprint: stale.fingerprint, status: 'snoozed' as const, snoozedUntil: addDays(TODAY, 3), updatedAt: '' }];
    expect(visibleInsights([stale], snoozed, TODAY)).toHaveLength(0);
    expect(visibleInsights([stale], snoozed, addDays(TODAY, 3))).toHaveLength(1);
  });
});
