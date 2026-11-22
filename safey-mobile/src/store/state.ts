import { seedCategories } from '@/domain/categories';
import type {
  Budget,
  Category,
  ConsentRecord,
  FinancialSource,
  ImportJob,
  InsightState,
  PlannedItem,
  Profile,
  SavedScenario,
  Transaction,
} from '@/domain/types';

export const SCHEMA_VERSION = 1;
export const PRIVACY_POLICY_VERSION = 'local-2026-10';
export const AI_POLICY_VERSION = 'ai-2026-10';

export interface AppData {
  schemaVersion: number;
  profile: Profile | null;
  consents: ConsentRecord[];
  sources: FinancialSource[];
  categories: Category[];
  transactions: Transaction[];
  plannedItems: PlannedItem[];
  budgets: Budget[];
  scenarios: SavedScenario[];
  insightStates: InsightState[];
  importJobs: ImportJob[];
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: null,
    consents: [],
    sources: [],
    categories: seedCategories(),
    transactions: [],
    plannedItems: [],
    budgets: [],
    scenarios: [],
    insightStates: [],
    importJobs: [],
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

export function activeConsent(consents: ConsentRecord[], purpose: ConsentRecord['purpose']): ConsentRecord | null {
  const latest = [...consents].filter((c) => c.purpose === purpose).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt))[0];
  return latest && latest.revokedAt === null ? latest : null;
}
