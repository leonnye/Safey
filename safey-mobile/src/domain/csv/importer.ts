import { fallbackCategoryId } from '../categories';
import { isLocalDate } from '../dates';
import { MAX_AMOUNT_MINOR } from '../money';
import type { Category, CurrencyCode, Direction, LocalDate, Minor, Transaction } from '../types';

export type DateFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'DD-MM-YYYY' | 'DD.MM.YYYY';
export const DATE_FORMATS: DateFormat[] = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY'];

export type AmountMode = 'signed' | 'direction_column' | 'debit_credit';

export interface CsvMapping {
  date: number | null;
  dateFormat: DateFormat | null;
  description: number | null;
  amountMode: AmountMode;
  amount: number | null;
  direction: number | null;
  debit: number | null;
  credit: number | null;
  currency: number | null;
  category: number | null;
}

export const EMPTY_MAPPING: CsvMapping = {
  date: null,
  dateFormat: null,
  description: null,
  amountMode: 'signed',
  amount: null,
  direction: null,
  debit: null,
  credit: null,
  currency: null,
  category: null,
};

/** Suggests columns from header names. The user still confirms every field before preview. */
export function suggestMapping(headers: string[]): CsvMapping {
  const find = (...patterns: RegExp[]) => {
    const idx = headers.findIndex((h) => patterns.some((p) => p.test(h.trim().toLowerCase())));
    return idx === -1 ? null : idx;
  };
  const debit = find(/^debit/, /^withdrawal/, /^money out/, /^paid out/);
  const credit = find(/^credit/, /^deposit/, /^money in/, /^paid in/);
  const amount = find(/^amount/, /^value/, /^sum/);
  const direction = find(/^type$/, /^direction/, /^dr\/cr/, /^cr\/dr/, /transaction type/);
  const mode: AmountMode = debit !== null && credit !== null ? 'debit_credit' : direction !== null ? 'direction_column' : 'signed';
  return {
    date: find(/^date/, /transaction date/, /^posted/, /^value date/),
    dateFormat: null,
    description: find(/^desc/, /^narration/, /^details/, /^memo/, /^reference/, /^note/, /^particular/),
    amountMode: mode,
    amount,
    direction,
    debit,
    credit,
    currency: find(/^currency/, /^ccy/),
    category: find(/^category/),
  };
}

const DATE_PATTERNS: Record<DateFormat, RegExp> = {
  'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'DD-MM-YYYY': /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  'DD.MM.YYYY': /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
};

export function parseDateWithFormat(raw: string, format: DateFormat): LocalDate | null {
  const value = raw.trim().split(/[ T]/)[0];
  const m = DATE_PATTERNS[format].exec(value);
  if (!m) return null;
  let y: string;
  let mo: string;
  let d: string;
  if (format === 'YYYY-MM-DD') [, y, mo, d] = m;
  else if (format === 'MM/DD/YYYY') [, mo, d, y] = m;
  else [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isLocalDate(iso) ? iso : null;
}

/** Formats that read every sample date as a real date. More than one means the user must choose. */
export function compatibleDateFormats(samples: string[]): DateFormat[] {
  const values = samples.map((s) => s.trim()).filter(Boolean);
  if (values.length === 0) return [];
  return DATE_FORMATS.filter((f) => values.every((v) => parseDateWithFormat(v, f) !== null));
}

/** Parses an amount cell into signed minor units. Parentheses or a leading minus mean negative. */
export function parseCsvAmount(raw: string): { ok: true; signedMinor: Minor } | { ok: false; error: string } {
  let v = raw.trim();
  if (v === '') return { ok: false, error: 'Amount is blank' };
  let negative = false;
  if (/^\(.*\)$/.test(v)) {
    negative = true;
    v = v.slice(1, -1).trim();
  }
  v = v.replace(/^(GH₵|GHS|GHC|₵|USD|US\$|\$)\s*/i, '').replace(/\s*(GH₵|GHS|GHC|USD)$/i, '').replace(/\s/g, '');
  if (v.startsWith('-')) {
    negative = !negative;
    v = v.slice(1);
  } else if (v.startsWith('+')) v = v.slice(1);
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(v)) return { ok: false, error: `Amount “${raw.trim()}” is not a number Safey can read` };
  const [whole, fraction = ''] = v.replace(/,/g, '').split('.');
  if (whole.length > 12) return { ok: false, error: 'Amount is too large' };
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (minor === 0) return { ok: false, error: 'Amount is zero' };
  if (minor > MAX_AMOUNT_MINOR) return { ok: false, error: 'Amount is too large' };
  return { ok: true, signedMinor: negative ? -minor : minor };
}

const INCOME_WORDS = ['in', 'credit', 'cr', 'received', 'receive', 'deposit', 'income', 'cash in', 'money in', '+'];
const EXPENSE_WORDS = ['out', 'debit', 'dr', 'sent', 'send', 'payment', 'paid', 'withdrawal', 'expense', 'cash out', 'money out', '-'];

export function parseDirectionWord(raw: string): Direction | null {
  const v = raw.trim().toLowerCase();
  if (INCOME_WORDS.includes(v)) return 'income';
  if (EXPENSE_WORDS.includes(v)) return 'expense';
  return null;
}

const CURRENCY_ALIASES: Record<CurrencyCode, string[]> = {
  GHS: ['GHS', 'GHC', 'GH₵', '₵', 'CEDI', 'CEDIS'],
  USD: ['USD', 'US$', '$', 'DOLLAR', 'DOLLARS'],
};

export function currencyCellMatches(raw: string, currency: CurrencyCode): boolean {
  return CURRENCY_ALIASES[currency].includes(raw.trim().toUpperCase());
}

export type RowStatus = 'valid' | 'duplicate' | 'invalid';

export interface PreviewRow {
  /** 1-based row number in the file, counting the header as row 1. */
  fileRow: number;
  status: RowStatus;
  errors: string[];
  duplicateReason: string | null;
  date: LocalDate | null;
  direction: Direction | null;
  amountMinor: Minor | null;
  description: string;
  categoryId: string | null;
  categoryMatched: boolean;
  externalRefHash: string;
}

export interface PreviewSummary {
  rows: PreviewRow[];
  valid: number;
  duplicates: number;
  invalid: number;
  mappingErrors: string[];
}

export function mappingErrors(m: CsvMapping): string[] {
  const errors: string[] = [];
  if (m.date === null) errors.push('Choose the date column.');
  if (m.dateFormat === null) errors.push('Choose how dates are written.');
  if (m.amountMode === 'debit_credit') {
    if (m.debit === null || m.credit === null) errors.push('Choose both the money-out and money-in columns.');
  } else if (m.amount === null) errors.push('Choose the amount column.');
  if (m.amountMode === 'direction_column' && m.direction === null) errors.push('Choose the column that says whether money came in or went out.');
  return errors;
}

/** Shared duplicate key: same source, date, direction, amount and description (case and spacing ignored). */
export function duplicateKey(sourceId: string, date: string, direction: Direction, amountMinor: Minor, description: string): string {
  return `${sourceId}|${date}|${direction}|${amountMinor}|${description.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

export const DUPLICATE_RULE_TEXT =
  'A row is marked as a likely duplicate when it has the same date, amount, money in/out and description as a record already in this source, or as an earlier row in this file. Likely duplicates are not selected unless you choose them.';

/** Builds the non-destructive preview. Nothing is written. */
export function previewImport(params: {
  rows: string[][];
  mapping: CsvMapping;
  fileHash: string;
  sourceId: string;
  existing: Transaction[];
  categories: Category[];
  currency?: CurrencyCode;
}): PreviewSummary {
  const { rows, mapping, fileHash, sourceId, existing, categories } = params;
  const currency = params.currency ?? 'GHS';
  const mErrors = mappingErrors(mapping);
  if (mErrors.length) return { rows: [], valid: 0, duplicates: 0, invalid: 0, mappingErrors: mErrors };

  const existingKeys = new Set(
    existing.filter((t) => t.sourceId === sourceId).map((t) => duplicateKey(t.sourceId, t.date, t.direction, t.amountMinor, t.note)),
  );
  const existingRefs = new Set(existing.map((t) => t.externalRefHash).filter(Boolean) as string[]);
  const seenInFile = new Set<string>();
  const cell = (r: string[], idx: number | null) => (idx === null ? '' : (r[idx] ?? '').trim());

  const out: PreviewRow[] = rows.map((r, i) => {
    const errors: string[] = [];
    const fileRow = i + 2;
    const ref = `${fileHash}:${fileRow}`;
    const date = parseDateWithFormat(cell(r, mapping.date), mapping.dateFormat!);
    if (!date) errors.push(`Date “${cell(r, mapping.date)}” does not match ${mapping.dateFormat}`);

    let direction: Direction | null = null;
    let amountMinor: Minor | null = null;
    if (mapping.amountMode === 'debit_credit') {
      const out = cell(r, mapping.debit);
      const inn = cell(r, mapping.credit);
      if (out && inn) errors.push('Both money-out and money-in have values');
      else if (!out && !inn) errors.push('Amount is blank');
      else {
        const parsed = parseCsvAmount(out || inn);
        if (!parsed.ok) errors.push(parsed.error);
        else {
          amountMinor = Math.abs(parsed.signedMinor);
          direction = out ? 'expense' : 'income';
        }
      }
    } else {
      const parsed = parseCsvAmount(cell(r, mapping.amount));
      if (!parsed.ok) errors.push(parsed.error);
      else {
        amountMinor = Math.abs(parsed.signedMinor);
        if (mapping.amountMode === 'signed') direction = parsed.signedMinor < 0 ? 'expense' : 'income';
        else {
          direction = parseDirectionWord(cell(r, mapping.direction));
          if (!direction) errors.push(`Cannot tell if “${cell(r, mapping.direction)}” is money in or out`);
        }
      }
    }

    if (mapping.currency !== null) {
      const c = cell(r, mapping.currency).toUpperCase();
      if (!c) errors.push('Currency is blank');
      else if (!currencyCellMatches(c, currency)) errors.push(`Currency ${c} does not match ${currency}. Change currency in Profile, or fix this row.`);
    }

    const description = cell(r, mapping.description).slice(0, 200);
    let categoryId: string | null = null;
    let categoryMatched = false;
    if (direction) {
      const label = cell(r, mapping.category).toLowerCase();
      const match = label ? categories.find((c) => c.isActive && c.direction === direction && c.name.toLowerCase() === label) : undefined;
      categoryMatched = Boolean(match);
      categoryId = match?.id ?? fallbackCategoryId(direction);
    }

    let status: RowStatus = errors.length ? 'invalid' : 'valid';
    let duplicateReason: string | null = null;
    if (status === 'valid' && date && direction && amountMinor !== null) {
      const key = duplicateKey(sourceId, date, direction, amountMinor, description);
      if (existingRefs.has(ref)) duplicateReason = 'Already imported from this file';
      else if (existingKeys.has(key)) duplicateReason = 'Matches a record already in this source';
      else if (seenInFile.has(key)) duplicateReason = 'Matches an earlier row in this file';
      seenInFile.add(key);
      if (duplicateReason) status = 'duplicate';
    }
    return { fileRow, status, errors, duplicateReason, date, direction, amountMinor, description, categoryId, categoryMatched, externalRefHash: ref };
  });

  return {
    rows: out,
    valid: out.filter((r) => r.status === 'valid').length,
    duplicates: out.filter((r) => r.status === 'duplicate').length,
    invalid: out.filter((r) => r.status === 'invalid').length,
    mappingErrors: [],
  };
}

/**
 * Turns confirmed rows into transactions. Idempotent: rows whose file reference already
 * exists are skipped, so a repeated commit cannot create copies.
 */
export function buildImportedTransactions(params: {
  rows: PreviewRow[];
  selectedFileRows: Set<number>;
  sourceId: string;
  importJobId: string;
  existing: Transaction[];
  newId: () => string;
  nowIso: string;
  currency?: CurrencyCode;
}): { transactions: Transaction[]; skippedAlreadyImported: number } {
  const refs = new Set(params.existing.map((t) => t.externalRefHash).filter(Boolean) as string[]);
  const txns: Transaction[] = [];
  let skipped = 0;
  for (const r of params.rows) {
    if (!params.selectedFileRows.has(r.fileRow)) continue;
    if (r.status === 'invalid' || !r.date || !r.direction || r.amountMinor === null || !r.categoryId) continue;
    if (refs.has(r.externalRefHash)) {
      skipped++;
      continue;
    }
    refs.add(r.externalRefHash);
    txns.push({
      id: params.newId(),
      sourceId: params.sourceId,
      categoryId: r.categoryId,
      direction: r.direction,
      amountMinor: r.amountMinor,
      currency: params.currency ?? 'GHS',
      date: r.date,
      note: r.description,
      origin: 'csv',
      importJobId: params.importJobId,
      externalRefHash: r.externalRefHash,
      createdAt: params.nowIso,
      updatedAt: params.nowIso,
    });
  }
  return { transactions: txns, skippedAlreadyImported: skipped };
}
