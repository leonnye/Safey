import { seedCategories } from '@/domain/categories';
import type {
  Budget,
  Category,
  FinancialSource,
  ImportJob,
  InsightState,
  LocalDate,
  Minor,
  PlannedItem,
  Profile,
  SavedScenario,
  Transaction,
} from '@/domain/types';

export const SCHEMA_VERSION = 1;

export type GoalIcon = 'plane' | 'shield' | 'home' | 'laptop' | 'graduation' | 'heart' | 'car' | 'gift';

/** Money the user is setting aside. Tracking only; Safey never moves money. */
export interface SavingsGoal {
  id: string;
  name: string;
  targetMinor: Minor;
  savedMinor: Minor;
  targetDate: LocalDate | null;
  icon: GoalIcon;
  createdAt: string;
}

/** A planned bill marked paid (or expected income marked received), with the record it created. */
export interface BillPayment {
  id: string;
  plannedItemId: string;
  direction: 'income' | 'expense';
  label: string;
  amountMinor: Minor;
  dueDate: LocalDate;
  paidOn: LocalDate;
  transactionId: string;
  createdAt: string;
}

export interface AppData {
  schemaVersion: number;
  profile: Profile | null;
  sources: FinancialSource[];
  categories: Category[];
  transactions: Transaction[];
  plannedItems: PlannedItem[];
  budgets: Budget[];
  scenarios: SavedScenario[];
  insightStates: InsightState[];
  importJobs: ImportJob[];
  goals: SavingsGoal[];
  billPayments: BillPayment[];
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: null,
    sources: [],
    categories: seedCategories(),
    transactions: [],
    plannedItems: [],
    budgets: [],
    scenarios: [],
    insightStates: [],
    importJobs: [],
    goals: [],
    billPayments: [],
  };
}

/** Accepts stored data only when its shape and schema version are recognised. */
export function migrate(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<AppData>;
  if (data.schemaVersion !== SCHEMA_VERSION) return null;
  const base = emptyData();
  return {
    ...base,
    ...data,
    categories: Array.isArray(data.categories) && data.categories.length ? data.categories : base.categories,
  } as AppData;
}
