export const CSV_LIMITS = {
  maxBytes: 1_000_000,
  maxRows: 5_000,
  maxColumns: 40,
  maxCellLength: 500,
} as const;

export type CsvParseResult =
  | { ok: true; headers: string[]; rows: string[][]; delimiter: ',' | ';' }
  | { ok: false; error: string };

function detectDelimiter(firstLine: string): ',' | ';' {
  let commas = 0;
  let semis = 0;
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === ',') commas++;
    else if (!quoted && ch === ';') semis++;
  }
  return semis > commas ? ';' : ',';
}

/**
 * RFC 4180-style parser: quoted fields, escaped quotes, CRLF/LF. Cells are plain text;
 * nothing is evaluated, so spreadsheet formulas stay inert strings.
 */
export function parseCsv(input: string): CsvParseResult {
  const byteLength = new TextEncoder().encode(input).length;
  if (byteLength > CSV_LIMITS.maxBytes) {
    return { ok: false, error: `File is larger than ${CSV_LIMITS.maxBytes / 1_000_000} MB. Split it into smaller files.` };
  }
  const text = input.replace(/^\uFEFF/, '');
  if (text.includes('\u0000')) return { ok: false, error: 'This does not look like a text CSV file.' };
  if (text.trim() === '') return { ok: false, error: 'The file is empty.' };
  const firstLineEnd = text.search(/\r?\n/);
  const delimiter = detectDelimiter(firstLineEnd === -1 ? text : text.slice(0, firstLineEnd));

  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    pushCell();
    if (!(row.length === 1 && row[0].trim() === '')) records.push(row);
    row = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"' && cell === '') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      pushCell();
      i++;
      continue;
    }
    if (ch === '\r' && text[i + 1] === '\n') {
      pushRow();
      i += 2;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      pushRow();
      i++;
      continue;
    }
    cell += ch;
    i++;
    if (records.length > CSV_LIMITS.maxRows + 1) break;
  }
  if (inQuotes) return { ok: false, error: 'A quoted value is not closed. Check the file was exported as CSV.' };
  if (cell !== '' || row.length > 0) pushRow();

  if (records.length < 2) return { ok: false, error: 'The file needs a header row and at least one data row.' };
  const headers = records[0].map((h, idx) => h.trim() || `Column ${idx + 1}`);
  if (headers.length > CSV_LIMITS.maxColumns) return { ok: false, error: `The file has more than ${CSV_LIMITS.maxColumns} columns.` };
  const rows = records.slice(1);
  if (rows.length > CSV_LIMITS.maxRows) return { ok: false, error: `The file has more than ${CSV_LIMITS.maxRows.toLocaleString()} rows.` };
  return {
    ok: true,
    headers,
    rows: rows.map((r) => r.map((c) => c.slice(0, CSV_LIMITS.maxCellLength))),
    delimiter,
  };
}

/** Stable 32-bit FNV-1a hash rendered as hex, used to recognise a file imported before. */
export function hashText(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, '0')}-${input.length.toString(16)}`;
}

/** Prefixes cells that a spreadsheet would treat as a formula. */
export function escapeCsvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[",\n\r;]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
}
