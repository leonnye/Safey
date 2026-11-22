import { describe, expect, it } from 'vitest';
import {
  buildImportedTransactions,
  compatibleDateFormats,
  type CsvMapping,
  EMPTY_MAPPING,
  parseCsvAmount,
  previewImport,
  suggestMapping,
} from '../csv/importer';
import { escapeCsvCell, hashText, parseCsv, toCsv } from '../csv/parse';
import { categories, txn } from './fixtures';

const SAMPLE = [
  'Date,Description,Amount,Currency,Category',
  '2026-10-01,"Market, Makola",-120.50,GHS,Food & market',
  '2026-10-02,Client payment,1500,GHS,',
  '2026-10-02,Client payment,1500,GHS,',
  '2026-10-03,Trotro,-8,USD,Transport',
  '2026-13-03,Bad date,-8,GHS,',
  '2026-10-04,"=HYPERLINK(""http://x"")",-1,GHS,',
].join('\r\n');

const mapping: CsvMapping = { ...EMPTY_MAPPING, date: 0, dateFormat: 'YYYY-MM-DD', description: 1, amount: 2, currency: 3, category: 4 };

describe('parseCsv', () => {
  it('handles quotes, embedded commas and escaped quotes', () => {
    const r = parseCsv(SAMPLE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.headers).toEqual(['Date', 'Description', 'Amount', 'Currency', 'Category']);
    expect(r.rows[0][1]).toBe('Market, Makola');
    expect(r.rows[5][1]).toBe('=HYPERLINK("http://x")');
  });
  it('detects semicolon files and strips a BOM', () => {
    const r = parseCsv('\uFEFFDate;Amount\n01.10.2026;-5,00\n');
    expect(r.ok && r.delimiter).toBe(';');
  });
  it('rejects unclosed quotes and header-only files', () => {
    expect(parseCsv('a,b\n"x,1').ok).toBe(false);
    expect(parseCsv('a,b\n').ok).toBe(false);
  });
});

describe('amounts and dates', () => {
  it.each([
    ['-120.50', -12050],
    ['(45.00)', -4500],
    ['GHS 1,200', 120000],
    ['+3', 300],
  ])('reads %s', (raw, signed) => {
    expect(parseCsvAmount(raw)).toEqual({ ok: true, signedMinor: signed });
  });
  it('rejects ambiguous or invalid amounts', () => {
    for (const raw of ['', '0', '1.234', '12,5', 'abc']) expect(parseCsvAmount(raw).ok).toBe(false);
  });
  it('does not silently pick between ambiguous day/month formats', () => {
    expect(compatibleDateFormats(['05/06/2026', '07/08/2026'])).toEqual(['DD/MM/YYYY', 'MM/DD/YYYY']);
    expect(compatibleDateFormats(['25/06/2026'])).toEqual(['DD/MM/YYYY']);
  });
  it('suggests columns but leaves the date format for the user', () => {
    const m = suggestMapping(['Transaction Date', 'Narration', 'Debit', 'Credit']);
    expect(m).toMatchObject({ date: 0, description: 1, amountMode: 'debit_credit', debit: 2, credit: 3, dateFormat: null });
  });
});

describe('preview and commit', () => {
  const parsed = parseCsv(SAMPLE);
  if (!parsed.ok) throw new Error('fixture');
  const fileHash = hashText(SAMPLE);
  const existing = [txn({ date: '2026-10-01', amountMinor: 12050, direction: 'expense', note: 'market, makola' })];

  it('classifies valid, duplicate and invalid rows without writing anything', () => {
    const p = previewImport({ rows: parsed.rows, mapping, fileHash, sourceId: 'src-cash', existing, categories });
    expect(p.rows.map((r) => r.status)).toEqual(['duplicate', 'valid', 'duplicate', 'invalid', 'invalid', 'valid']);
    expect(p.rows[0].duplicateReason).toContain('already in this source');
    expect(p.rows[2].duplicateReason).toContain('earlier row');
    expect(p.rows[3].errors[0]).toContain('USD');
    expect(p.rows[1].categoryId).toBe('sys-income-uncategorised');
  });

  it('reports missing mapping instead of guessing', () => {
    const p = previewImport({ rows: parsed.rows, mapping: { ...mapping, dateFormat: null }, fileHash, sourceId: 'src-cash', existing, categories });
    expect(p.mappingErrors.length).toBe(1);
    expect(p.rows).toHaveLength(0);
  });

  it('commits only selected valid rows and is idempotent on repeat', () => {
    const p = previewImport({ rows: parsed.rows, mapping, fileHash, sourceId: 'src-cash', existing, categories });
    let n = 0;
    const args = { rows: p.rows, selectedFileRows: new Set([3, 5, 7]), sourceId: 'src-cash', importJobId: 'job1', newId: () => `n${++n}`, nowIso: '2026-10-30T00:00:00Z' };
    const first = buildImportedTransactions({ ...args, existing });
    expect(first.transactions.map((t) => t.note)).toEqual(['Client payment', '=HYPERLINK("http://x")']);
    const second = buildImportedTransactions({ ...args, existing: [...existing, ...first.transactions] });
    expect(second.transactions).toHaveLength(0);
    expect(second.skippedAlreadyImported).toBe(2);
  });
});

describe('export safety', () => {
  it('neutralises formula prefixes', () => {
    expect(escapeCsvCell('=1+1')).toBe("'=1+1");
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCsvCell('-5')).toBe("'-5");
    expect(toCsv(['a'], [['x,"y"']])).toBe('a\r\n"x,""y"""');
  });
});
