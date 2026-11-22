/** Calendar date in the user's timezone, formatted `YYYY-MM-DD`. */
export type LocalDate = string;

/** Integer amount in minor units (pesewas or cents). Always positive in records. */
export type Minor = number;

export type CurrencyCode = 'GHS' | 'USD';

export type Direction = 'income' | 'expense';

export type SourceKind = 'cash' | 'bank_manual' | 'mobile_money_manual' | 'other';

export interface Profile {
  displayName: string;
  locale: 'en-GH';
  timezone: string;
  defaultCurrency: CurrencyCode;
  ageConfirmedAt: string;
  /** Planning buffer the user wants to keep available; used by warning rules. */
  bufferMinor: Minor;
  mode: 'personal' | 'demo';
  createdAt: string;
}

export type ConsentPurpose = 'core_local_storage' | 'ai_explanations';

export interface ConsentRecord {
  id: string;
  purpose: ConsentPurpose;
  policyVersion: string;
  grantedAt: string;
  revokedAt: string | null;
}

export interface FinancialSource {
  id: string;
  label: string;
  kind: SourceKind;
  /** Balance the user entered, valid as of `openingDate`. */
  openingBalanceMinor: Minor;
  openingDate: LocalDate;
  isArchived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  direction: Direction;
  isSystem: boolean;
  isActive: boolean;
}

export type TransactionOrigin = 'manual' | 'csv';

export interface Transaction {
  id: string;
  sourceId: string;
  categoryId: string;
  direction: Direction;
  amountMinor: Minor;
  currency: CurrencyCode;
  date: LocalDate;
  note: string;
  origin: TransactionOrigin;
  importJobId: string | null;
  externalRefHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Frequency = 'once' | 'weekly' | 'monthly';

/** User-entered upcoming money: a bill to pay or income the user expects. Not a creditor or employer feed. */
export interface PlannedItem {
  id: string;
  label: string;
  direction: Direction;
  amountMinor: Minor;
  currency: CurrencyCode;
  dueDate: LocalDate;
  frequency: Frequency;
  categoryId: string | null;
  isActive: boolean;
  createdAt: string;
}

export type BudgetPeriod = 'week' | 'month';

export interface Budget {
  id: string;
  categoryId: string;
  limitMinor: Minor;
  period: BudgetPeriod;
  createdAt: string;
}

export type ScenarioTemplate = 'delayed_income' | 'one_off_expense' | 'recurring_savings' | 'custom_change';

export type ScenarioInputs =
  | { template: 'delayed_income'; plannedItemId: string; delayDays: number }
  | { template: 'one_off_expense'; amountMinor: Minor; date: LocalDate; label: string }
  | { template: 'recurring_savings'; amountMinor: Minor; startDate: LocalDate; frequency: 'weekly' | 'monthly' }
  | {
      template: 'custom_change';
      label: string;
      direction: Direction;
      amountMinor: Minor;
      startDate: LocalDate;
      frequency: Frequency;
    };

export interface SavedScenario {
  id: string;
  name: string;
  inputs: ScenarioInputs;
  horizonDays: number;
  engineVersion: string;
  createdAt: string;
}

export type InsightStatus = 'dismissed' | 'snoozed';

export interface InsightState {
  fingerprint: string;
  status: InsightStatus;
  snoozedUntil: LocalDate | null;
  updatedAt: string;
}

export type ImportStatus = 'committed' | 'partially_committed';

export interface ImportJob {
  id: string;
  fileName: string;
  fileHash: string;
  rowCount: number;
  committedCount: number;
  skippedCount: number;
  status: ImportStatus;
  sourceId: string;
  createdAt: string;
}
