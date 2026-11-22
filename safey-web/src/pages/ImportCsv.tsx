import { CheckCircle2, CircleAlert, FileText, FileUp, Square, SquareCheck } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner, Button, Field, PageHeader, Segmented, Tile } from '@/components/ui';
import {
  type AmountMode,
  compatibleDateFormats,
  type CsvMapping,
  DATE_FORMATS,
  type DateFormat,
  DUPLICATE_RULE_TEXT,
  type PreviewRow,
  previewImport,
  suggestMapping,
} from '@/domain/csv/importer';
import { CSV_LIMITS, hashText, parseCsv } from '@/domain/csv/parse';
import { formatDate } from '@/domain/dates';
import type { ImportJob } from '@/domain/types';
import { money } from '@/lib/format';
import { useStore } from '@/store/store';
import { useLookups } from '@/store/useFinance';

interface Loaded {
  fileName: string;
  size: number;
  fileHash: string;
  headers: string[];
  rows: string[][];
}

const NONE = '__none__';
type Filter = 'valid' | 'duplicate' | 'invalid';

function sizeText(bytes: number) {
  return bytes >= 1000 ? `${Math.round(bytes / 1000)} KB` : `${bytes} B`;
}

export function ImportCsv() {
  const navigate = useNavigate();
  const { data, currency, commitImport } = useStore();
  const { categoryName } = useLookups();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [sourceId, setSourceId] = useState(data.sources.find((s) => !s.isArchived)?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [selected, setSelected] = useState<Set<number> | null>(null);
  const [filter, setFilter] = useState<Filter>('valid');
  const [job, setJob] = useState<ImportJob | null>(null);

  const load = (text: string, fileName: string, size: number) => {
    const parsed = parseCsv(text);
    if (!parsed.ok) return setError(parsed.error);
    setError(null);
    setLoaded({ fileName, size, fileHash: hashText(text), headers: parsed.headers, rows: parsed.rows });
    const suggested = suggestMapping(parsed.headers);
    if (suggested.date !== null) {
      const only = compatibleDateFormats(parsed.rows.slice(0, 50).map((r) => r[suggested.date!] ?? ''));
      if (only.length === 1) suggested.dateFormat = only[0]!;
    }
    setMapping(suggested);
    setSelected(null);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) return setError('Choose a .csv file. Excel files need to be saved as CSV first.');
    if (file.size > CSV_LIMITS.maxBytes) return setError(`That file is larger than ${CSV_LIMITS.maxBytes / 1_000_000} MB. Split it into smaller files.`);
    try {
      load(await file.text(), file.name, file.size);
    } catch {
      setError('Safey could not read that file. Try exporting it again as CSV.');
    }
  };

  const preview = useMemo(() => {
    if (!loaded || !mapping || !sourceId) return null;
    return previewImport({ rows: loaded.rows, mapping, fileHash: loaded.fileHash, sourceId, existing: data.transactions, categories: data.categories, currency });
  }, [loaded, mapping, sourceId, data.transactions, data.categories, currency]);

  const activeSources = data.sources.filter((s) => !s.isArchived);

  if (job) {
    return (
      <div className="page">
        <PageHeader title="Import finished" />
        <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', padding: 28 }}>
          <Tile visual={{ icon: CheckCircle2, hue: '#73D6AE' }} solid large size={26} />
          <h2 className="title-lg">{job.committedCount} transactions imported</h2>
          <p className="small secondary">
            From {job.fileName}. {job.skippedCount > 0 ? `${job.skippedCount} rows were left out (not selected, duplicates or problems).` : ''} Importing this file again won’t create copies.
          </p>
        </div>
        <Button block onClick={() => navigate('/transactions')}>
          See transactions
        </Button>
        <Button
          variant="ghost"
          block
          onClick={() => {
            setJob(null);
            setLoaded(null);
            setMapping(null);
          }}
        >
          Import another file
        </Button>
      </div>
    );
  }

  if (!loaded || !mapping) {
    return (
      <div className="page">
        <PageHeader title="Import CSV" back />
        {activeSources.length === 0 ? <Banner tone="warning">Add an account first so Safey knows where these records belong.</Banner> : null}
        <button
          className={`dropzone ${drag ? 'drag' : ''}`}
          disabled={activeSources.length === 0}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void readFile(e.dataTransfer.files[0]);
          }}
        >
          <Tile visual={{ icon: FileUp, hue: '#B9A3FF' }} solid large size={24} />
          <strong>Drop a CSV statement here</strong>
          <span className="small muted">or click to choose a file from a bank, Mobile Money statement or spreadsheet</span>
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" hidden onChange={(e) => void readFile(e.target.files?.[0])} />
        <Button variant="ghost" onClick={() => setShowPaste((s) => !s)}>
          {showPaste ? 'Hide paste box' : 'Paste CSV text instead'}
        </Button>
        {showPaste ? (
          <div className="card stack">
            <textarea className="input" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Date,Description,Amount\n2026-10-01,Market,-45.00'} spellCheck={false} />
            <Button variant="secondary" disabled={!paste.trim() || activeSources.length === 0} onClick={() => load(paste, 'Pasted text', new TextEncoder().encode(paste).length)}>
              Read pasted text
            </Button>
          </div>
        ) : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <div className="card stack">
          <strong>How import works</strong>
          <ol className="small secondary" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Choose a CSV file.</li>
            <li>Check which column is which.</li>
            <li>Review the rows. Nothing is saved until you confirm.</li>
          </ol>
          <p className="hint">
            Up to {CSV_LIMITS.maxBytes / 1_000_000} MB and {CSV_LIMITS.maxRows.toLocaleString()} rows. The file stays in this browser and formulas in it are never run.
          </p>
        </div>
        {data.importJobs.length > 0 ? (
          <>
            <div className="section-head">
              <h2>Earlier imports</h2>
            </div>
            <div className="card card--flush">
              <div className="list">
                {data.importJobs.slice(0, 5).map((j) => (
                  <div key={j.id} className="list-row">
                    <Tile visual={{ icon: FileText, hue: '#91B9FF' }} />
                    <div className="grow">
                      <div className="title">{j.fileName}</div>
                      <div className="sub">
                        {formatDate(j.createdAt.slice(0, 10))} · {j.committedCount} saved, {j.skippedCount} left out
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  const columnOptions = [{ value: NONE, label: 'Not in file' }, ...loaded.headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` }))];
  const setCol = (key: keyof CsvMapping) => (v: string) => {
    setMapping({ ...mapping, [key]: v === NONE ? null : Number(v), ...(key === 'date' ? { dateFormat: null } : {}) });
    setSelected(null);
  };
  const colValue = (idx: number | null) => (idx === null ? NONE : String(idx));
  const dateSamples = mapping.date !== null ? loaded.rows.slice(0, 50).map((r) => r[mapping.date!] ?? '') : [];
  const compatible = compatibleDateFormats(dateSamples);

  const mapRows: { key: keyof CsvMapping; label: string; optional?: boolean }[] = [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description', optional: true },
    ...(mapping.amountMode === 'debit_credit'
      ? [
          { key: 'debit' as const, label: 'Money out' },
          { key: 'credit' as const, label: 'Money in' },
        ]
      : [{ key: 'amount' as const, label: 'Amount' }]),
    ...(mapping.amountMode === 'direction_column' ? [{ key: 'direction' as const, label: 'Type (in/out)' }] : []),
    { key: 'category', label: 'Category', optional: true },
    { key: 'currency', label: 'Currency', optional: true },
  ];

  const ready = preview && preview.mappingErrors.length === 0;
  const sel = selected ?? new Set(preview?.rows.filter((r) => r.status === 'valid').map((r) => r.fileRow) ?? []);
  const selectedCount = preview ? preview.rows.filter((r) => sel.has(r.fileRow) && r.status !== 'invalid').length : 0;
  const shown = preview ? preview.rows.filter((r) => r.status === filter) : [];
  const toggle = (r: PreviewRow) => {
    if (r.status === 'invalid') return;
    const next = new Set(sel);
    if (next.has(r.fileRow)) next.delete(r.fileRow);
    else next.add(r.fileRow);
    setSelected(next);
  };

  return (
    <div className="page page--wide">
      <PageHeader title="Import Review" back />
      <div className="row-card" style={{ padding: 18 }}>
        <Tile visual={{ icon: FileText, hue: '#B9A3FF' }} solid large size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="title-md" style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loaded.fileName}
          </div>
          <div className="small muted">
            {sizeText(loaded.size)} · {loaded.headers.length} columns
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setLoaded(null)}>
          Change
        </Button>
      </div>

      <div className="card grid-3 stats3" style={{ padding: 0 }}>
        <div>
          <div className="n num">{loaded.rows.length}</div>
          <div className="tiny muted">Total rows</div>
        </div>
        <div>
          <div className="n num" style={{ color: 'var(--lavender)' }}>
            {preview && ready ? preview.valid : '–'}
          </div>
          <div className="tiny" style={{ color: 'var(--lavender)' }}>
            Valid
          </div>
        </div>
        <div>
          <div className="n num out">{preview && ready ? preview.invalid + preview.duplicates : '–'}</div>
          <div className="tiny out">Issues</div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <div className="section-head">
            <h2>Mapping</h2>
          </div>
          <Field label="Add these records to">
            <select className="select" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {activeSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="field">
            <span>How amounts are shown</span>
            <Segmented<AmountMode>
              label="How amounts are shown"
              value={mapping.amountMode}
              onChange={(m) => {
                setMapping({ ...mapping, amountMode: m });
                setSelected(null);
              }}
              options={[
                { value: 'signed', label: '− = out' },
                { value: 'direction_column', label: 'Type col.' },
                { value: 'debit_credit', label: 'In / out' },
              ]}
            />
          </div>
          <div className="card card--flush">
            {mapRows.map((m) => {
              const v = mapping[m.key] as number | null;
              return (
                <div key={m.key} className="map-row">
                  <div>
                    <div style={{ fontWeight: 500 }}>{m.label}</div>
                    {v !== null ? (
                      <span className="mapped">
                        Mapped <CheckCircle2 size={13} />
                      </span>
                    ) : (
                      <span className="tiny muted">{m.optional ? 'Optional' : 'Required'}</span>
                    )}
                  </div>
                  <select className="select" aria-label={`${m.label} column`} value={colValue(v)} onChange={(e) => setCol(m.key)(e.target.value)}>
                    {columnOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          {mapping.date !== null ? (
            <Field label="How dates are written" hint={dateSamples[0] ? `First date in file: “${dateSamples[0]}”` : undefined}>
              <select
                className="select"
                value={mapping.dateFormat ?? ''}
                onChange={(e) => {
                  setMapping({ ...mapping, dateFormat: (e.target.value || null) as DateFormat | null });
                  setSelected(null);
                }}
              >
                <option value="">Choose a format</option>
                {DATE_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                    {compatible.includes(f) ? ' ✓ fits' : ''}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {compatible.length > 1 && !mapping.dateFormat ? <Banner tone="warning">These dates could be read more than one way ({compatible.join(' or ')}). Choose the one your file uses.</Banner> : null}
          {preview?.mappingErrors.map((e) => (
            <p key={e} className="small" style={{ color: 'var(--warning)' }}>
              • {e}
            </p>
          ))}
        </div>

        {ready && preview ? (
          <div className="stack">
            <div className="section-head">
              <h2>Rows</h2>
              <span className="small muted">{selectedCount} selected</span>
            </div>
            <div className="chips">
              {(
                [
                  ['valid', `Ready ${preview.valid}`],
                  ['duplicate', `Duplicates ${preview.duplicates}`],
                  ['invalid', `Problems ${preview.invalid}`],
                ] as const
              ).map(([k, label]) => (
                <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                  {label}
                </button>
              ))}
            </div>
            {filter === 'duplicate' ? <p className="hint">{DUPLICATE_RULE_TEXT}</p> : null}
            <div className="card card--flush" style={{ maxHeight: 460, overflowY: 'auto' }}>
              {shown.length === 0 ? (
                <p className="small muted" style={{ padding: 16 }}>
                  No rows here.
                </p>
              ) : (
                <div className="list">
                  {shown.slice(0, 300).map((r) => {
                    const on = sel.has(r.fileRow) && r.status !== 'invalid';
                    return (
                      <button key={r.fileRow} className="list-row" role={r.status === 'invalid' ? undefined : 'checkbox'} aria-checked={r.status === 'invalid' ? undefined : on} onClick={() => toggle(r)} style={{ alignItems: 'flex-start' }}>
                        {r.status === 'invalid' ? <CircleAlert size={20} color="var(--expense)" /> : on ? <SquareCheck size={20} color="var(--lavender)" /> : <Square size={20} className="muted" />}
                        <div className="grow">
                          <div className="title">{r.description || (r.categoryId ? categoryName(r.categoryId) : `Row ${r.fileRow}`)}</div>
                          <div className="sub">
                            Row {r.fileRow}
                            {r.date ? ` · ${formatDate(r.date)}` : ''}
                            {r.categoryId ? ` · ${categoryName(r.categoryId)}` : ''}
                          </div>
                          {r.duplicateReason ? (
                            <div className="tiny" style={{ color: 'var(--warning)', marginTop: 4 }}>
                              {r.duplicateReason}
                            </div>
                          ) : null}
                          {r.errors.map((e) => (
                            <div key={e} className="tiny out" style={{ marginTop: 4 }}>
                              {e}
                            </div>
                          ))}
                        </div>
                        {r.amountMinor !== null && r.direction ? (
                          <span className={`amount num ${r.direction === 'income' ? 'in' : 'out'}`}>
                            {r.direction === 'income' ? '+' : '−'} {money(r.amountMinor, currency)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button
        block
        disabled={!ready || selectedCount === 0}
        onClick={() => {
          if (!preview) return;
          try {
            setJob(commitImport({ fileName: loaded.fileName, fileHash: loaded.fileHash, sourceId, rows: preview.rows, selected: sel }));
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Import failed. Nothing was saved.');
          }
        }}
      >
        {ready ? `Import ${selectedCount} Transaction${selectedCount === 1 ? '' : 's'}` : 'Finish mapping to continue'}
      </Button>
    </div>
  );
}
