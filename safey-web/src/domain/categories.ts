import type { Category, Direction } from './types';

export const UNCATEGORISED_EXPENSE_ID = 'sys-expense-uncategorised';
export const UNCATEGORISED_INCOME_ID = 'sys-income-uncategorised';

const seed: [string, string, Direction][] = [
  ['sys-food-market', 'Food & market', 'expense'],
  ['sys-transport', 'Transport', 'expense'],
  ['sys-utilities', 'Utilities', 'expense'],
  ['sys-rent-housing', 'Rent & housing', 'expense'],
  ['sys-health', 'Health', 'expense'],
  ['sys-education', 'Education', 'expense'],
  ['sys-family-support', 'Family support', 'expense'],
  ['sys-airtime-data', 'Airtime & data', 'expense'],
  ['sys-fees', 'Fees & charges', 'expense'],
  ['sys-savings', 'Savings', 'expense'],
  [UNCATEGORISED_EXPENSE_ID, 'Other expense', 'expense'],
  ['sys-income-work', 'Work & wages', 'income'],
  ['sys-income-business', 'Business & sales', 'income'],
  ['sys-income-side', 'Side work', 'income'],
  ['sys-income-support', 'Support received', 'income'],
  [UNCATEGORISED_INCOME_ID, 'Other income', 'income'],
];

/** Ghana-relevant starter categories from the PRD; names are provisional until user-tested. */
export function seedCategories(): Category[] {
  return seed.map(([id, name, direction]) => ({ id, name, direction, isSystem: true, isActive: true }));
}

export function fallbackCategoryId(direction: Direction): string {
  return direction === 'income' ? UNCATEGORISED_INCOME_ID : UNCATEGORISED_EXPENSE_ID;
}
