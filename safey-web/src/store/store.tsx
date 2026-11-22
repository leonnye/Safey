import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { fallbackCategoryId } from '@/domain/categories';
import { buildImportedTransactions, type PreviewRow } from '@/domain/csv/importer';
import { addDays, addMonths, DEFAULT_TIMEZONE, isLocalDate, todayIn } from '@/domain/dates';
import { MAX_AMOUNT_MINOR } from '@/domain/money';
import type {
  Budget,
  Category,
  CurrencyCode,
  Direction,
  FinancialSource,
  ImportJob,
  InsightState,
  PlannedItem,
  Profile,
  SavedScenario,
  Transaction,
} from '@/domain/types';
import { buildDemoData } from './demo';
import { type AppData, type BillPayment, emptyData, migrate, type SavingsGoal } from './state';

const STORAGE_KEY = 'safey.web.v1';

export const newId = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

export interface TransactionDraft {
  sourceId: string;
  categoryId: string;
  direction: Direction;
  amountMinor: number;
  date: string;
  note: string;
}

export interface OnboardingInput {
  displayName: string;
  currency: CurrencyCode;
  bufferMinor: number;
  source: { label: string; kind: FinancialSource['kind']; openingBalanceMinor: number } | null;
}

type Loaded = { data: AppData; error: string | null };

function loadInitial(): Loaded {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: emptyData(), error: null };
    const migrated = migrate(JSON.parse(raw));
    if (!migrated) return { data: emptyData(), error: 'Saved data is from an unknown version and was not loaded. It has not been deleted.' };
    return { data: migrated, error: null };
  } catch {
    return { data: emptyData(), error: 'Safey could not read the data saved in this browser.' };
  }
}

function assertAmount(minor: number) {
  if (!Number.isInteger(minor) || minor <= 0 || minor > MAX_AMOUNT_MINOR) throw new Error('Enter an amount above zero.');
}

function useStoreValue() {
  const [initial] = useState(loadInitial);
  const [data, setData] = useState<AppData>(initial.data);
  const [loadError] = useState(initial.error);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dataRef = useRef(data);

  const commit = useCallback(
    (updater: (d: AppData) => AppData) => {
      const next = updater(dataRef.current);
      dataRef.current = next;
      setData(next);
      if (loadError) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSaveError(null);
      } catch {
        setSaveError('Your last change could not be saved in this browser. Storage may be full or blocked.');
      }
    },
    [loadError],
  );

  const today = todayIn(data.profile?.timezone ?? DEFAULT_TIMEZONE);
  const currency: CurrencyCode = data.profile?.defaultCurrency ?? 'GHS';

  const checkDraft = useCallback((d: TransactionDraft) => {
    assertAmount(d.amountMinor);
    if (!isLocalDate(d.date)) throw new Error('Enter a valid date.');
    if (!dataRef.current.sources.some((s) => s.id === d.sourceId)) throw new Error('Choose an account.');
    const cat = dataRef.current.categories.find((c) => c.id === d.categoryId);
    if (!cat || cat.direction !== d.direction) throw new Error('Choose a category for this type.');
    if (d.note.length > 200) throw new Error('Keep the description under 200 characters.');
  }, []);

  const actions = useMemo(() => {
    const cur = () => dataRef.current.profile?.defaultCurrency ?? 'GHS';
    return {
      completeOnboarding(input: OnboardingInput) {
        const now = nowIso();
        const t = todayIn(DEFAULT_TIMEZONE);
        commit((d) => ({
          ...d,
          profile: {
            displayName: input.displayName.trim().slice(0, 40),
            locale: 'en-GH',
            timezone: DEFAULT_TIMEZONE,
            defaultCurrency: input.currency,
            ageConfirmedAt: now,
            bufferMinor: input.bufferMinor,
            mode: 'personal',
            createdAt: now,
          },
          sources: input.source
            ? [{ id: newId(), label: input.source.label, kind: input.source.kind, openingBalanceMinor: input.source.openingBalanceMinor, openingDate: t, isArchived: false, createdAt: now }]
            : [],
        }));
      },
      startDemo() {
        const now = nowIso();
        const t = todayIn(DEFAULT_TIMEZONE);
        const demo = buildDemoData(t, newId, now);
        commit(() => ({
          ...emptyData(),
          profile: { displayName: 'Ama', locale: 'en-GH', timezone: DEFAULT_TIMEZONE, defaultCurrency: 'GHS', ageConfirmedAt: now, bufferMinor: 20_000, mode: 'demo', createdAt: now },
          ...demo,
        }));
      },
      updateProfile(patch: Partial<Pick<Profile, 'displayName' | 'bufferMinor' | 'defaultCurrency'>>) {
        commit((d) => {
          if (!d.profile) return d;
          const next = patch.defaultCurrency;
          const relabel = next !== undefined && next !== d.profile.defaultCurrency;
          return {
            ...d,
            profile: { ...d.profile, ...patch },
            transactions: relabel ? d.transactions.map((t) => ({ ...t, currency: next })) : d.transactions,
            plannedItems: relabel ? d.plannedItems.map((p) => ({ ...p, currency: next })) : d.plannedItems,
          };
        });
      },
      addTransaction(draft: TransactionDraft): Transaction {
        checkDraft(draft);
        const now = nowIso();
        const t: Transaction = { ...draft, note: draft.note.trim(), id: newId(), currency: cur(), origin: 'manual', importJobId: null, externalRefHash: null, createdAt: now, updatedAt: now };
        commit((d) => ({ ...d, transactions: [...d.transactions, t] }));
        return t;
      },
      updateTransaction(id: string, draft: TransactionDraft) {
        checkDraft(draft);
        commit((d) => ({
          ...d,
          transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...draft, note: draft.note.trim(), currency: cur(), updatedAt: nowIso() } : t)),
        }));
      },
      deleteTransaction(id: string): Transaction | null {
        const found = dataRef.current.transactions.find((t) => t.id === id) ?? null;
        commit((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
        return found;
      },
      restoreTransaction(t: Transaction) {
        commit((d) => (d.transactions.some((x) => x.id === t.id) ? d : { ...d, transactions: [...d.transactions, t] }));
      },
      saveSource(input: Omit<FinancialSource, 'id' | 'createdAt' | 'isArchived'> & { id?: string }): FinancialSource {
        if (!input.label.trim()) throw new Error('Give this account a name.');
        if (!Number.isInteger(input.openingBalanceMinor) || input.openingBalanceMinor < 0 || input.openingBalanceMinor > MAX_AMOUNT_MINOR) {
          throw new Error('Enter a starting balance of zero or more.');
        }
        if (!isLocalDate(input.openingDate)) throw new Error('Enter a valid date for the starting balance.');
        const existing = input.id ? dataRef.current.sources.find((s) => s.id === input.id) : undefined;
        const fields = { label: input.label.trim().slice(0, 40), kind: input.kind, openingBalanceMinor: input.openingBalanceMinor, openingDate: input.openingDate };
        const source: FinancialSource = existing ? { ...existing, ...fields } : { id: newId(), ...fields, isArchived: false, createdAt: nowIso() };
        commit((d) => ({ ...d, sources: existing ? d.sources.map((s) => (s.id === source.id ? source : s)) : [...d.sources, source] }));
        return source;
      },
      setSourceArchived(id: string, archived: boolean) {
        commit((d) => ({ ...d, sources: d.sources.map((s) => (s.id === id ? { ...s, isArchived: archived } : s)) }));
      },
      addCategory(name: string, direction: Direction): Category {
        const trimmed = name.trim().slice(0, 40);
        if (!trimmed) throw new Error('Enter a category name.');
        if (dataRef.current.categories.some((c) => c.direction === direction && c.name.toLowerCase() === trimmed.toLowerCase())) {
          throw new Error('A category with that name already exists.');
        }
        const cat: Category = { id: newId(), name: trimmed, direction, isSystem: false, isActive: true };
        commit((d) => ({ ...d, categories: [...d.categories, cat] }));
        return cat;
      },
      savePlannedItem(input: Omit<PlannedItem, 'id' | 'createdAt' | 'currency'> & { id?: string }) {
        assertAmount(input.amountMinor);
        if (!input.label.trim()) throw new Error('Give this a name.');
        if (!isLocalDate(input.dueDate)) throw new Error('Enter a valid date.');
        commit((d) => {
          const label = input.label.trim().slice(0, 60);
          if (input.id) return { ...d, plannedItems: d.plannedItems.map((p) => (p.id === input.id ? { ...p, ...input, label, currency: cur() } : p)) };
          return { ...d, plannedItems: [...d.plannedItems, { ...input, label, id: newId(), currency: cur(), createdAt: nowIso() }] };
        });
      },
      deletePlannedItem(id: string) {
        commit((d) => ({ ...d, plannedItems: d.plannedItems.filter((p) => p.id !== id) }));
      },
      /** Records a bill as paid (or expected income as received) and moves a repeating item to its next date. */
      markPlannedDone(itemId: string, sourceId: string, paidOn: string) {
        const item = dataRef.current.plannedItems.find((p) => p.id === itemId);
        if (!item) throw new Error('That item no longer exists.');
        if (!dataRef.current.sources.some((s) => s.id === sourceId)) throw new Error('Choose an account.');
        if (!isLocalDate(paidOn)) throw new Error('Enter a valid date.');
        const now = nowIso();
        const txn: Transaction = {
          id: newId(),
          sourceId,
          categoryId: item.categoryId ?? fallbackCategoryId(item.direction),
          direction: item.direction,
          amountMinor: item.amountMinor,
          currency: cur(),
          date: paidOn,
          note: item.label,
          origin: 'manual',
          importJobId: null,
          externalRefHash: null,
          createdAt: now,
          updatedAt: now,
        };
        const payment: BillPayment = { id: newId(), plannedItemId: item.id, direction: item.direction, label: item.label, amountMinor: item.amountMinor, dueDate: item.dueDate, paidOn, transactionId: txn.id, createdAt: now };
        const nextDue = item.frequency === 'weekly' ? addDays(item.dueDate, 7) : item.frequency === 'monthly' ? addMonths(item.dueDate, 1) : item.dueDate;
        commit((d) => ({
          ...d,
          transactions: [...d.transactions, txn],
          billPayments: [payment, ...d.billPayments],
          plannedItems: d.plannedItems.map((p) => (p.id !== item.id ? p : item.frequency === 'once' ? { ...p, isActive: false } : { ...p, dueDate: nextDue })),
        }));
      },
      saveBudget(input: Omit<Budget, 'id' | 'createdAt'> & { id?: string }) {
        assertAmount(input.limitMinor);
        commit((d) => {
          const others = d.budgets.filter((b) => b.id !== input.id && !(b.categoryId === input.categoryId && b.period === input.period));
          return { ...d, budgets: [...others, { ...input, id: input.id ?? newId(), createdAt: nowIso() }] };
        });
      },
      deleteBudget(id: string) {
        commit((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }));
      },
      saveGoal(input: Omit<SavingsGoal, 'id' | 'createdAt'> & { id?: string }) {
        assertAmount(input.targetMinor);
        if (!input.name.trim()) throw new Error('Give this goal a name.');
        if (input.savedMinor < 0 || input.savedMinor > MAX_AMOUNT_MINOR) throw new Error('Enter a saved amount of zero or more.');
        if (input.targetDate && !isLocalDate(input.targetDate)) throw new Error('Enter a valid target date.');
        commit((d) => {
          const name = input.name.trim().slice(0, 40);
          if (input.id) return { ...d, goals: d.goals.map((g) => (g.id === input.id ? { ...g, ...input, name } : g)) };
          return { ...d, goals: [...d.goals, { ...input, name, id: newId(), createdAt: nowIso() }] };
        });
      },
      adjustGoal(id: string, deltaMinor: number) {
        commit((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, savedMinor: Math.max(0, Math.min(MAX_AMOUNT_MINOR, g.savedMinor + deltaMinor)) } : g)) }));
      },
      deleteGoal(id: string) {
        commit((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
      },
      saveScenario(s: Omit<SavedScenario, 'id' | 'createdAt'>) {
        commit((d) => ({ ...d, scenarios: [{ ...s, id: newId(), createdAt: nowIso() }, ...d.scenarios].slice(0, 30) }));
      },
      setInsightState(fingerprint: string, status: InsightState['status'] | null, snoozedUntil?: string) {
        commit((d) => {
          const others = d.insightStates.filter((s) => s.fingerprint !== fingerprint);
          if (status === null) return { ...d, insightStates: others };
          return { ...d, insightStates: [...others, { fingerprint, status, snoozedUntil: snoozedUntil ?? null, updatedAt: nowIso() }] };
        });
      },
      commitImport(params: { fileName: string; fileHash: string; sourceId: string; rows: PreviewRow[]; selected: Set<number> }): ImportJob {
        const { fileName, fileHash, sourceId, rows, selected } = params;
        if (!dataRef.current.sources.some((s) => s.id === sourceId)) throw new Error('Choose an account for these records.');
        const jobId = newId();
        const now = nowIso();
        const built = buildImportedTransactions({ rows, selectedFileRows: selected, sourceId, importJobId: jobId, existing: dataRef.current.transactions, newId, nowIso: now, currency: cur() });
        const job: ImportJob = {
          id: jobId,
          fileName,
          fileHash,
          rowCount: rows.length,
          committedCount: built.transactions.length,
          skippedCount: rows.length - built.transactions.length,
          status: built.transactions.length === rows.length ? 'committed' : 'partially_committed',
          sourceId,
          createdAt: now,
        };
        commit((d) => ({ ...d, transactions: [...d.transactions, ...built.transactions], importJobs: [job, ...d.importJobs] }));
        return job;
      },
      deleteAllData() {
        localStorage.removeItem(STORAGE_KEY);
        const fresh = emptyData();
        dataRef.current = fresh;
        setData(fresh);
      },
    };
  }, [commit, checkDraft]);

  return { data, today, currency, loadError, saveError, ...actions };
}

export type Store = ReturnType<typeof useStoreValue>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
