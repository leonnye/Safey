import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildImportedTransactions, type PreviewRow } from '@/domain/csv/importer';
import { DEFAULT_TIMEZONE, isLocalDate, todayIn } from '@/domain/dates';
import { MAX_AMOUNT_MINOR } from '@/domain/money';
import type {
  Budget,
  Category,
  ConsentPurpose,
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
import { activeConsent, AI_POLICY_VERSION, type AppData, emptyData, migrate, PRIVACY_POLICY_VERSION } from './state';

const STORAGE_KEY = 'safey.data.v1';

export const newId = () => Crypto.randomUUID();
const nowIso = () => new Date().toISOString();

type Status = 'loading' | 'ready' | 'error';

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
  bufferMinor: number;
  currency: Profile['defaultCurrency'];
  aiConsent: boolean;
  source: { label: string; kind: FinancialSource['kind']; openingBalanceMinor: number } | null;
}

interface StoreValue {
  status: Status;
  loadError: string | null;
  saveError: string | null;
  data: AppData;
  today: string;
  completeOnboarding(input: OnboardingInput): void;
  startDemo(): void;
  updateProfile(patch: Partial<Pick<Profile, 'displayName' | 'bufferMinor' | 'defaultCurrency'>>): void;
  setConsent(purpose: ConsentPurpose, granted: boolean): void;
  addTransaction(draft: TransactionDraft): Transaction;
  updateTransaction(id: string, draft: TransactionDraft): void;
  deleteTransaction(id: string): Transaction | null;
  restoreTransaction(t: Transaction): void;
  saveSource(source: Omit<FinancialSource, 'id' | 'createdAt' | 'isArchived'> & { id?: string }): FinancialSource;
  setSourceArchived(id: string, archived: boolean): void;
  addCategory(name: string, direction: Direction): Category;
  setCategoryActive(id: string, active: boolean): void;
  savePlannedItem(item: Omit<PlannedItem, 'id' | 'createdAt' | 'currency'> & { id?: string }): void;
  deletePlannedItem(id: string): void;
  saveBudget(budget: Omit<Budget, 'id' | 'createdAt'> & { id?: string }): void;
  deleteBudget(id: string): void;
  saveScenario(s: Omit<SavedScenario, 'id' | 'createdAt'>): void;
  deleteScenario(id: string): void;
  setInsightState(fingerprint: string, status: InsightState['status'] | null, snoozedUntil?: string): void;
  commitImport(params: { fileName: string; fileHash: string; sourceId: string; rows: PreviewRow[]; selected: Set<number> }): ImportJob;
  deleteAllData(): Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

function assertAmount(minor: number) {
  if (!Number.isInteger(minor) || minor <= 0 || minor > MAX_AMOUNT_MINOR) throw new Error('Enter an amount above zero.');
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dataRef = useRef(data);
  const saveChain = useRef(Promise.resolve());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const migrated = migrate(JSON.parse(raw));
          if (!migrated) {
            setLoadError('Saved data is from an unknown version and was not loaded. It has not been deleted.');
            setStatus('error');
            return;
          }
          dataRef.current = migrated;
          setData(migrated);
        }
        setStatus('ready');
      } catch {
        setLoadError('Safey could not read data saved on this device.');
        setStatus('error');
      }
    })();
  }, []);

  const commit = useCallback((updater: (d: AppData) => AppData) => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    const json = JSON.stringify(next);
    saveChain.current = saveChain.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, json))
      .then(() => setSaveError(null))
      .catch(() => setSaveError('Your last change could not be saved on this device. Try again.'));
  }, []);

  const today = todayIn(data.profile?.timezone ?? DEFAULT_TIMEZONE);

  const checkDraft = useCallback((d: TransactionDraft) => {
    assertAmount(d.amountMinor);
    if (!isLocalDate(d.date)) throw new Error('Enter a valid date.');
    const source = dataRef.current.sources.find((s) => s.id === d.sourceId);
    if (!source) throw new Error('Choose where the money moved.');
    const cat = dataRef.current.categories.find((c) => c.id === d.categoryId);
    if (!cat || cat.direction !== d.direction) throw new Error('Choose a category for this type.');
    if (d.note.length > 200) throw new Error('Keep the note under 200 characters.');
  }, []);

  const value = useMemo<StoreValue>(() => {
    const grant = (purpose: ConsentPurpose, version: string) => ({
      id: newId(),
      purpose,
      policyVersion: version,
      grantedAt: nowIso(),
      revokedAt: null,
    });
    return {
      status,
      loadError,
      saveError,
      data,
      today,
      completeOnboarding(input) {
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
          consents: [grant('core_local_storage', PRIVACY_POLICY_VERSION), ...(input.aiConsent ? [grant('ai_explanations', AI_POLICY_VERSION)] : [])],
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
          profile: { displayName: 'Ama (sample)', locale: 'en-GH', timezone: DEFAULT_TIMEZONE, defaultCurrency: 'GHS', ageConfirmedAt: now, bufferMinor: 20_000, mode: 'demo', createdAt: now },
          consents: [grant('core_local_storage', PRIVACY_POLICY_VERSION)],
          ...demo,
        }));
      },
      updateProfile(patch) {
        commit((d) => {
          if (!d.profile) return d;
          const nextCurrency = patch.defaultCurrency;
          const relabel = nextCurrency !== undefined && nextCurrency !== d.profile.defaultCurrency;
          return {
            ...d,
            profile: { ...d.profile, ...patch },
            transactions: relabel ? d.transactions.map((t) => ({ ...t, currency: nextCurrency })) : d.transactions,
            plannedItems: relabel ? d.plannedItems.map((p) => ({ ...p, currency: nextCurrency })) : d.plannedItems,
          };
        });
      },
      setConsent(purpose, granted) {
        commit((d) => {
          const current = activeConsent(d.consents, purpose);
          if (granted && !current) return { ...d, consents: [...d.consents, grant(purpose, purpose === 'ai_explanations' ? AI_POLICY_VERSION : PRIVACY_POLICY_VERSION)] };
          if (!granted && current) return { ...d, consents: d.consents.map((c) => (c.id === current.id ? { ...c, revokedAt: nowIso() } : c)) };
          return d;
        });
      },
      addTransaction(draft) {
        checkDraft(draft);
        const now = nowIso();
        const t: Transaction = { ...draft, note: draft.note.trim(), id: newId(), currency: dataRef.current.profile?.defaultCurrency ?? 'GHS', origin: 'manual', importJobId: null, externalRefHash: null, createdAt: now, updatedAt: now };
        commit((d) => ({ ...d, transactions: [...d.transactions, t] }));
        return t;
      },
      updateTransaction(id, draft) {
        checkDraft(draft);
        commit((d) => ({
          ...d,
          transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...draft, note: draft.note.trim(), currency: d.profile?.defaultCurrency ?? t.currency, updatedAt: nowIso() } : t)),
        }));
      },
      deleteTransaction(id) {
        const found = dataRef.current.transactions.find((t) => t.id === id) ?? null;
        commit((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
        return found;
      },
      restoreTransaction(t) {
        commit((d) => (d.transactions.some((x) => x.id === t.id) ? d : { ...d, transactions: [...d.transactions, t] }));
      },
      saveSource(input) {
        if (!input.label.trim()) throw new Error('Give this source a name.');
        if (!Number.isInteger(input.openingBalanceMinor) || input.openingBalanceMinor < 0 || input.openingBalanceMinor > MAX_AMOUNT_MINOR) {
          throw new Error('Enter a starting balance of zero or more.');
        }
        if (!isLocalDate(input.openingDate)) throw new Error('Enter a valid date for the starting balance.');
        const existing = input.id ? dataRef.current.sources.find((s) => s.id === input.id) : undefined;
        const source: FinancialSource = existing
          ? { ...existing, label: input.label.trim(), kind: input.kind, openingBalanceMinor: input.openingBalanceMinor, openingDate: input.openingDate }
          : { id: newId(), label: input.label.trim(), kind: input.kind, openingBalanceMinor: input.openingBalanceMinor, openingDate: input.openingDate, isArchived: false, createdAt: nowIso() };
        commit((d) => ({ ...d, sources: existing ? d.sources.map((s) => (s.id === source.id ? source : s)) : [...d.sources, source] }));
        return source;
      },
      setSourceArchived(id, archived) {
        commit((d) => ({ ...d, sources: d.sources.map((s) => (s.id === id ? { ...s, isArchived: archived } : s)) }));
      },
      addCategory(name, direction) {
        const trimmed = name.trim().slice(0, 40);
        if (!trimmed) throw new Error('Enter a category name.');
        if (dataRef.current.categories.some((c) => c.direction === direction && c.name.toLowerCase() === trimmed.toLowerCase())) {
          throw new Error('A category with that name already exists.');
        }
        const cat: Category = { id: newId(), name: trimmed, direction, isSystem: false, isActive: true };
        commit((d) => ({ ...d, categories: [...d.categories, cat] }));
        return cat;
      },
      setCategoryActive(id, active) {
        commit((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, isActive: active } : c)) }));
      },
      savePlannedItem(input) {
        assertAmount(input.amountMinor);
        if (!input.label.trim()) throw new Error('Give this item a name.');
        if (!isLocalDate(input.dueDate)) throw new Error('Enter a valid date.');
        commit((d) => {
          if (input.id) {
            return { ...d, plannedItems: d.plannedItems.map((p) => (p.id === input.id ? { ...p, ...input, label: input.label.trim(), currency: d.profile?.defaultCurrency ?? p.currency } : p)) };
          }
          const item: PlannedItem = { ...input, label: input.label.trim(), id: newId(), currency: d.profile?.defaultCurrency ?? 'GHS', createdAt: nowIso() };
          return { ...d, plannedItems: [...d.plannedItems, item] };
        });
      },
      deletePlannedItem(id) {
        commit((d) => ({ ...d, plannedItems: d.plannedItems.filter((p) => p.id !== id) }));
      },
      saveBudget(input) {
        assertAmount(input.limitMinor);
        commit((d) => {
          const others = d.budgets.filter((b) => b.id !== input.id && !(b.categoryId === input.categoryId && b.period === input.period));
          return { ...d, budgets: [...others, { ...input, id: input.id ?? newId(), createdAt: nowIso() }] };
        });
      },
      deleteBudget(id) {
        commit((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }));
      },
      saveScenario(s) {
        commit((d) => ({ ...d, scenarios: [{ ...s, id: newId(), createdAt: nowIso() }, ...d.scenarios] }));
      },
      deleteScenario(id) {
        commit((d) => ({ ...d, scenarios: d.scenarios.filter((s) => s.id !== id) }));
      },
      setInsightState(fingerprint, next, snoozedUntil) {
        commit((d) => {
          const others = d.insightStates.filter((s) => s.fingerprint !== fingerprint);
          if (next === null) return { ...d, insightStates: others };
          return { ...d, insightStates: [...others, { fingerprint, status: next, snoozedUntil: snoozedUntil ?? null, updatedAt: nowIso() }] };
        });
      },
      commitImport({ fileName, fileHash, sourceId, rows, selected }) {
        if (!dataRef.current.sources.some((s) => s.id === sourceId)) throw new Error('Choose a source for these records.');
        const jobId = newId();
        const now = nowIso();
        const built = buildImportedTransactions({ rows, selectedFileRows: selected, sourceId, importJobId: jobId, existing: dataRef.current.transactions, newId, nowIso: now, currency: dataRef.current.profile?.defaultCurrency ?? 'GHS' });
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
      async deleteAllData() {
        await saveChain.current;
        await AsyncStorage.removeItem(STORAGE_KEY);
        const fresh = emptyData();
        dataRef.current = fresh;
        setData(fresh);
        setLoadError(null);
        setStatus('ready');
      },
    };
  }, [data, status, loadError, saveError, today, commit, checkDraft]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
