import { useMemo } from 'react';
import { recordedPosition } from '@/domain/engine/summary';
import { evaluateWarnings, visibleInsights } from '@/domain/engine/warnings';
import { useStore } from './StoreProvider';

/** Deterministic engine outputs derived from the stored records. */
export function useFinance() {
  const { data, today } = useStore();
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
      currency: data.profile?.defaultCurrency ?? 'GHS',
    });
    const visible = visibleInsights(warnings.insights, data.insightStates, today);
    return { position, warnings, visible, coverage: warnings.coverage };
  }, [data, today]);
}

export function useCategoryName() {
  const { data } = useStore();
  return useMemo(() => {
    const map = new Map(data.categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? 'Uncategorised' : 'Uncategorised');
  }, [data.categories]);
}

export function useSourceLabel() {
  const { data } = useStore();
  return useMemo(() => {
    const map = new Map(data.sources.map((s) => [s.id, s.label]));
    return (id: string) => map.get(id) ?? 'Unknown source';
  }, [data.sources]);
}
