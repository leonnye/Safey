import { addDays, addMonths } from '@/domain/dates';
import type { Budget, FinancialSource, PlannedItem, Transaction } from '@/domain/types';
import type { SavingsGoal } from './state';

/** Deterministic pseudo-random sequence so demo data is the same on every device. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Clearly synthetic sample records for demo mode. Never mixed into a personal profile. */
export function buildDemoData(today: string, newId: () => string, nowIso: string) {
  const rand = seeded(42);
  const openingDate = addDays(today, -63);
  const sources: FinancialSource[] = [
    { id: newId(), label: 'Cash', kind: 'cash', openingBalanceMinor: 60_000, openingDate, isArchived: false, createdAt: nowIso },
    { id: newId(), label: 'MTN MoMo Wallet', kind: 'mobile_money_manual', openingBalanceMinor: 40_000, openingDate, isArchived: false, createdAt: nowIso },
    { id: newId(), label: 'Ghana Commercial Bank', kind: 'bank_manual', openingBalanceMinor: 80_000, openingDate, isArchived: false, createdAt: nowIso },
  ];
  const [cash, momo, bank] = sources;
  const tx: Transaction[] = [];
  const add = (daysAgo: number, direction: 'income' | 'expense', amountMinor: number, categoryId: string, note: string, sourceId: string) =>
    tx.push({
      id: newId(),
      sourceId,
      categoryId,
      direction,
      amountMinor,
      currency: 'GHS',
      date: addDays(today, -daysAgo),
      note,
      origin: 'manual',
      importJobId: null,
      externalRefHash: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

  for (let d = 1; d <= 60; d++) {
    if (rand() < 0.75) {
      const market = rand() < 0.5;
      add(d, 'expense', 1_500 + Math.round(rand() * 6_000), 'sys-food-market', market ? 'Makola market' : 'Groceries', market ? cash.id : momo.id);
    }
    if (rand() < 0.6) add(d, 'expense', 600 + Math.round(rand() * 1_400), 'sys-transport', rand() < 0.6 ? 'Trotro' : 'Uber', cash.id);
    if (d % 7 === 3) add(d, 'expense', 2_000 + Math.round(rand() * 2_000), 'sys-airtime-data', 'MTN data bundle', momo.id);
    if (d % 14 === 5) add(d, 'expense', 10_000, 'sys-family-support', 'Support for Mum', momo.id);
  }
  add(0, 'income', 20_000, 'sys-income-side', 'MTN MoMo top up', momo.id);
  add(4, 'expense', 9_000, 'sys-transport', 'Taxi to client', cash.id);
  add(3, 'expense', 7_500, 'sys-transport', 'Trip to Kumasi', momo.id);
  add(9, 'expense', 12_000, 'sys-utilities', 'Electricity bill', bank.id);
  [52, 31, 12].forEach((d, i) => add(d, 'income', [180_000, 95_000, 140_000][i], 'sys-income-side', 'Design client', momo.id));
  [45, 15].forEach((d) => add(d, 'income', 60_000, 'sys-income-business', 'Weekend sales', cash.id));
  add(26, 'income', 150_000, 'sys-income-work', 'Salary', bank.id);

  const planned: PlannedItem[] = [
    { id: newId(), label: 'Rent', direction: 'expense', amountMinor: 120_000, currency: 'GHS', dueDate: addDays(today, 3), frequency: 'monthly', categoryId: 'sys-rent-housing', isActive: true, createdAt: nowIso },
    { id: newId(), label: 'Airtime & Data', direction: 'expense', amountMinor: 10_000, currency: 'GHS', dueDate: addDays(today, 6), frequency: 'monthly', categoryId: 'sys-airtime-data', isActive: true, createdAt: nowIso },
    { id: newId(), label: 'Electricity', direction: 'expense', amountMinor: 12_000, currency: 'GHS', dueDate: addDays(today, 11), frequency: 'monthly', categoryId: 'sys-utilities', isActive: true, createdAt: nowIso },
    { id: newId(), label: 'Internet', direction: 'expense', amountMinor: 15_000, currency: 'GHS', dueDate: addDays(today, 19), frequency: 'monthly', categoryId: 'sys-utilities', isActive: true, createdAt: nowIso },
    { id: newId(), label: 'Design client payment', direction: 'income', amountMinor: 120_000, currency: 'GHS', dueDate: addDays(today, 14), frequency: 'once', categoryId: 'sys-income-side', isActive: true, createdAt: nowIso },
  ];

  const budgets: Budget[] = [
    { id: newId(), categoryId: 'sys-food-market', limitMinor: 120_000, period: 'month', createdAt: nowIso },
    { id: newId(), categoryId: 'sys-transport', limitMinor: 50_000, period: 'month', createdAt: nowIso },
    { id: newId(), categoryId: 'sys-utilities', limitMinor: 30_000, period: 'month', createdAt: nowIso },
    { id: newId(), categoryId: 'sys-airtime-data', limitMinor: 20_000, period: 'month', createdAt: nowIso },
  ];

  const goals: SavingsGoal[] = [
    { id: newId(), name: 'Trip to Cape Coast', targetMinor: 350_000, savedMinor: 157_500, targetDate: addMonths(today, 6), icon: 'plane', createdAt: nowIso },
    { id: newId(), name: 'Emergency Fund', targetMinor: 500_000, savedMinor: 160_000, targetDate: addMonths(today, 9), icon: 'shield', createdAt: nowIso },
  ];

  return { sources, transactions: tx, plannedItems: planned, budgets, goals };
}
