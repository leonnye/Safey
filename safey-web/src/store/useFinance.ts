import { useMemo } from 'react';
import { addDays } from '@/domain/dates';
import { expandPlannedItems } from '@/domain/engine/projection';
import { recordedPosition } from '@/domain/engine/summary';
import { evaluateWarnings, visibleInsights } from '@/domain/engine/warnings';
import { useStore } from './store';

/** Deterministic engine outputs derived from the stored records. */
export function useFinance() {
  const { data, today, currency } = useStore();
  return useMemo(() => {
    const position = recordedPosition(data.sources, data.transactions, today);
    const warnings = evaluateWarnings({
      today,
      sources: data.sources,
      transactions: data.transactions,
      plannedItems: data.plannedItems,
      budgets: data.budgets,
      categories: data.categories,
      bufferMinor: data.profile?.bufferMinor ?? 0,
      currency,
    });
    const visible = visibleInsights(warnings.insights, data.insightStates, today);
    const upcoming = expandPlannedItems(data.plannedItems, today, addDays(today, 30));
    const expectedIncomeMinor = upcoming.filter((o) => o.direction === 'income').reduce((s, o) => s + o.amountMinor, 0);
    const upcomingBillsMinor = upcoming.filter((o) => o.direction === 'expense').reduce((s, o) => s + o.amountMinor, 0);
    return { position, warnings, visible, coverage: warnings.coverage, upcoming, expectedIncomeMinor, upcomingBillsMinor };
  }, [data, today, currency]);
}

/** Recorded total balance for each of the last `days` days, oldest first. */
export function useBalanceHistory(days = 30) {
  const { data, today } = useStore();
  return useMemo(() => {
    const out: { date: string; valueMinor: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      out.push({ date, valueMinor: recordedPosition(data.sources, data.transactions, date).totalMinor });
    }
    return out;
  }, [data.sources, data.transactions, today, days]);
}

export function useLookups() {
  const { data } = useStore();
  return useMemo(() => {
    const cats = new Map(data.categories.map((c) => [c.id, c]));
    const srcs = new Map(data.sources.map((s) => [s.id, s]));
    return {
      category: (id: string | null) => (id ? cats.get(id) : undefined),
      categoryName: (id: string | null) => (id ? cats.get(id)?.name ?? 'Uncategorised' : 'Uncategorised'),
      sourceLabel: (id: string) => srcs.get(id)?.label ?? 'Unknown account',
    };
  }, [data.categories, data.sources]);
}
