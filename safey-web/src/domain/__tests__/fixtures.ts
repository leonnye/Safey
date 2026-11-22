import { seedCategories } from '../categories';
import { addDays } from '../dates';
import type { FinancialSource, PlannedItem, Transaction } from '../types';

export const TODAY = '2026-10-30';
export const categories = seedCategories();

let counter = 0;
export function txn(partial: Partial<Transaction> & Pick<Transaction, 'date' | 'amountMinor' | 'direction'>): Transaction {
  counter += 1;
  return {
    id: `t${counter}`,
    sourceId: 'src-cash',
    categoryId: partial.direction === 'income' ? 'sys-income-work' : 'sys-food-market',
    currency: 'GHS',
    note: '',
    origin: 'manual',
    importJobId: null,
    externalRefHash: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...partial,
  };
}

export const cash: FinancialSource = {
  id: 'src-cash',
  label: 'Cash',
  kind: 'cash',
  openingBalanceMinor: 100_000,
  openingDate: '2026-09-01',
  isArchived: false,
  createdAt: '2026-09-01T00:00:00Z',
};

/** One GH₵ 50 food expense on each of the last `days` days. */
export function dailySpending(days: number, amountMinor = 5_000, today = TODAY): Transaction[] {
  return Array.from({ length: days }, (_, i) => txn({ date: addDays(today, -1 - i), amountMinor, direction: 'expense' }));
}

export function bill(partial: Partial<PlannedItem> & Pick<PlannedItem, 'dueDate' | 'amountMinor'>): PlannedItem {
  counter += 1;
  return {
    id: `p${counter}`,
    label: 'Rent',
    direction: 'expense',
    currency: 'GHS',
    frequency: 'once',
    categoryId: 'sys-rent-housing',
    isActive: true,
    createdAt: '2026-10-01T00:00:00Z',
    ...partial,
  };
}
