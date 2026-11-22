import { toCsv } from './csv/parse';
import { minorToInput } from './money';
import type { Category, FinancialSource, Transaction } from './types';

export const EXPORT_FORMAT_VERSION = 'safey-export-1';

/** Full machine-readable export. Amounts are integer pesewas (`amountMinor`) with an ISO 4217 code. */
export function buildJsonExport(data: object, exportedAt: string): string {
  return JSON.stringify(
    {
      format: EXPORT_FORMAT_VERSION,
      exportedAt,
      notes: 'Amounts are in minor units (pesewas). Dates are calendar dates in the profile timezone (YYYY-MM-DD). Records were entered by the user or imported from CSV; none come from a connected provider.',
      data,
    },
    null,
    2,
  );
}

/** Spreadsheet-friendly transaction list with formula-safe cells. */
export function buildTransactionsCsv(transactions: Transaction[], categories: Category[], sources: FinancialSource[]): string {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const src = new Map(sources.map((s) => [s.id, s.label]));
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [
      t.date,
      t.direction,
      minorToInput(t.amountMinor),
      t.currency,
      cat.get(t.categoryId) ?? '',
      src.get(t.sourceId) ?? '',
      t.note,
      t.origin,
    ]);
  return toCsv(['date', 'direction', 'amount', 'currency', 'category', 'source', 'note', 'origin'], rows);
}
