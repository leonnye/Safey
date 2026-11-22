import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { AppText, Banner, Button, Card, Chip, Divider, Field, ListRow, Picker, type PickerOption, Screen, Segmented } from '@/components/ui';
import {
  type AmountMode,
  compatibleDateFormats,
  type CsvMapping,
  DATE_FORMATS,
  type DateFormat,
  DUPLICATE_RULE_TEXT,
  parseDateWithFormat,
  type PreviewRow,
  previewImport,
  suggestMapping,
} from '@/domain/csv/importer';
import { CSV_LIMITS, hashText, parseCsv } from '@/domain/csv/parse';
import { formatDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import type { ImportJob } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';
import { useCategoryName } from '@/store/useFinance';
import { color, space } from '@/theme/tokens';

type Step = 'choose' | 'map' | 'review' | 'done';
interface Loaded {
  fileName: string;
  fileHash: string;
  headers: string[];
  rows: string[][];
}

const NONE = '__none__';

export default function ImportScreen() {
  const { data, commitImport } = useStore();
  const categoryName = useCategoryName();
  const [step, setStep] = useState<Step>('choose');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(data.sources.find((s) => !s.isArchived)?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'valid' | 'duplicate' | 'invalid'>('valid');
  const [job, setJob] = useState<ImportJob | null>(null);

  const load = (text: string, fileName: string) => {
    const parsed = parseCsv(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setLoaded({ fileName, fileHash: hashText(text), headers: parsed.headers, rows: parsed.rows });
    setMapping(suggestMapping(parsed.headers));
    setStep('map');
  };

  const pickFile = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'], copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      if (!/\.(csv|txt)$/i.test(asset.name)) {
        setError('Choose a .csv file. Excel files need to be saved as CSV first.');
        return;
      }
      if (asset.size && asset.size > CSV_LIMITS.maxBytes) {
        setError(`That file is larger than ${CSV_LIMITS.maxBytes / 1_000_000} MB. Split it into smaller files.`);
        return;
      }
      const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
      load(text, asset.name);
    } catch {
      setError('Safey could not read that file. Try exporting it again as CSV, or paste the contents instead.');
    } finally {
      setBusy(false);
    }
  };

  const currency = data.profile?.defaultCurrency ?? 'GHS';
  const preview = useMemo(() => {
    if (!loaded || !mapping || !sourceId) return null;
    return previewImport({ rows: loaded.rows, mapping, fileHash: loaded.fileHash, sourceId, existing: data.transactions, categories: data.categories, currency });
  }, [loaded, mapping, sourceId, data.transactions, data.categories, currency]);

  if (step === 'choose' || !loaded || !mapping) {
    return (
      <Screen title="Import a CSV" back>
        <Card>
          <AppText variant="heading3">How import works</AppText>
          <AppText variant="bodySmall" tone="secondary">
            1. Choose a CSV file exported from a bank, Mobile Money statement or spreadsheet.{'\n'}2. Tell Safey which column is which.{'\n'}3. Review every row. Nothing is saved until you confirm.
          </AppText>
          <AppText variant="caption" tone="muted">
            Up to {CSV_LIMITS.maxBytes / 1_000_000} MB and {CSV_LIMITS.maxRows.toLocaleString()} rows. Comma or semicolon separated, UTF-8 text. Only GHS amounts. The file stays on this device and formulas in it are never run.
          </AppText>
        </Card>
        {data.sources.length === 0 ? (
          <Banner tone="warning" icon="wallet-outline" text="Add a money source first so Safey knows where these records belong." />
        ) : null}
        <Button label="Choose CSV file" icon="document-outline" onPress={pickFile} loading={busy} disabled={data.sources.length === 0} />
        <Button label={showPaste ? 'Hide paste box' : 'Paste CSV text instead'} variant="text" onPress={() => setShowPaste((s) => !s)} />
        {showPaste && (
          <Card>
            <Field label="CSV text" value={pasted} onChangeText={setPasted} multiline numberOfLines={8} style={{ minHeight: 160, textAlignVertical: 'top' }} placeholder={'Date,Description,Amount\n2026-10-01,Market,-45.00'} autoCapitalize="none" autoCorrect={false} />
            <Button label="Read pasted text" variant="secondary" disabled={!pasted.trim() || data.sources.length === 0} onPress={() => load(pasted, 'Pasted text')} />
          </Card>
        )}
        {error ? <Banner tone="danger" icon="alert-circle-outline" text={error} /> : null}
        {data.importJobs.length > 0 && (
          <Card>
            <AppText variant="heading3">Earlier imports</AppText>
            {data.importJobs.slice(0, 5).map((j) => (
              <ListRow key={j.id} icon="document-text-outline" title={j.fileName} subtitle={`${formatDate(j.createdAt.slice(0, 10))} · ${j.committedCount} saved, ${j.skippedCount} not imported`} />
            ))}
          </Card>
        )}
      </Screen>
    );
  }

  const columnOptions: PickerOption[] = [{ value: NONE, label: 'Not in this file' }, ...loaded.headers.map((h, i) => ({ value: String(i), label: h, description: `e.g. “${loaded.rows[0]?.[i] ?? ''}”` }))];
  const setCol = (key: keyof CsvMapping) => (v: string) => setMapping({ ...mapping, [key]: v === NONE ? null : Number(v) });
  const colValue = (idx: number | null) => (idx === null ? NONE : String(idx));
  const dateSamples = mapping.date !== null ? loaded.rows.slice(0, 50).map((r) => r[mapping.date!] ?? '') : [];
  const compatible = compatibleDateFormats(dateSamples);

  if (step === 'map') {
    const ready = preview && preview.mappingErrors.length === 0;
    return (
      <Screen
        title="Match the columns"
        back
        footer={
          <Button
            label={ready ? `Review ${preview!.rows.length} rows` : 'Review rows'}
            disabled={!ready}
            onPress={() => {
              setSelected(new Set(preview!.rows.filter((r) => r.status === 'valid').map((r) => r.fileRow)));
              setFilter('valid');
              setStep('review');
            }}
          />
        }
      >
        <Card>
          <ListRow icon="document-text-outline" title={loaded.fileName} subtitle={`${loaded.rows.length} data rows · ${loaded.headers.length} columns`} />
        </Card>
        <Picker label="Add these records to" value={sourceId} onChange={setSourceId} options={data.sources.filter((s) => !s.isArchived).map((s) => ({ value: s.id, label: s.label }))} />
        <Picker label="Date column" value={colValue(mapping.date)} onChange={setCol('date')} options={columnOptions} />
        {mapping.date !== null && (
          <View style={{ gap: space[2] }}>
            <Picker
              label="How dates are written"
              value={mapping.dateFormat}
              onChange={(v) => setMapping({ ...mapping, dateFormat: v as DateFormat })}
              placeholder="Choose a date format"
              options={DATE_FORMATS.map((f) => ({ value: f, label: f, description: compatible.includes(f) ? 'Fits every date in the first 50 rows' : "Doesn't fit some dates" }))}
            />
            {compatible.length > 1 && !mapping.dateFormat ? (
              <Banner tone="warning" icon="help-circle-outline" text={`These dates could be read more than one way (${compatible.join(' or ')}). Choose the one your file uses.`} />
            ) : null}
            {mapping.dateFormat ? (
              <AppText variant="bodySmall" tone="secondary">
                {dateSamples
                  .slice(0, 3)
                  .map((s) => {
                    const d = parseDateWithFormat(s, mapping.dateFormat!);
                    return `“${s}” → ${d ? formatDate(d) : 'not readable'}`;
                  })
                  .join('\n')}
              </AppText>
            ) : null}
          </View>
        )}
        <Segmented<AmountMode>
          label="How amounts are shown"
          value={mapping.amountMode}
          onChange={(m) => setMapping({ ...mapping, amountMode: m })}
          options={[
            { value: 'signed', label: '− means out' },
            { value: 'direction_column', label: 'Type column' },
            { value: 'debit_credit', label: 'In / out columns' },
          ]}
        />
        {mapping.amountMode === 'debit_credit' ? (
          <>
            <Picker label="Money out column (debit)" value={colValue(mapping.debit)} onChange={setCol('debit')} options={columnOptions} />
            <Picker label="Money in column (credit)" value={colValue(mapping.credit)} onChange={setCol('credit')} options={columnOptions} />
          </>
        ) : (
          <Picker label="Amount column" value={colValue(mapping.amount)} onChange={setCol('amount')} options={columnOptions} />
        )}
        {mapping.amountMode === 'signed' ? (
          <AppText variant="caption" tone="muted">
            Negative numbers or numbers in brackets are money out. Positive numbers are money in.
          </AppText>
        ) : null}
        {mapping.amountMode === 'direction_column' && (
          <>
            <Picker label="Money in / out column" value={colValue(mapping.direction)} onChange={setCol('direction')} options={columnOptions} />
            <AppText variant="caption" tone="muted">
              Recognised words: in, credit, CR, received, deposit / out, debit, DR, sent, payment, withdrawal.
            </AppText>
          </>
        )}
        <Picker label="Description column (optional)" value={colValue(mapping.description)} onChange={setCol('description')} options={columnOptions} />
        <Picker label="Category column (optional)" value={colValue(mapping.category)} onChange={setCol('category')} options={columnOptions} />
        <Picker label="Currency column (optional)" value={colValue(mapping.currency)} onChange={setCol('currency')} options={columnOptions} />
        {preview?.mappingErrors.map((e) => (
          <AppText key={e} variant="bodySmall" tone="warning">
            • {e}
          </AppText>
        ))}
      </Screen>
    );
  }

  if (step === 'review' && preview) {
    const rows = preview.rows.filter((r) => r.status === filter);
    const selectedCount = preview.rows.filter((r) => selected.has(r.fileRow) && r.status !== 'invalid').length;
    const toggle = (r: PreviewRow) => {
      if (r.status === 'invalid') return;
      const next = new Set(selected);
      if (next.has(r.fileRow)) next.delete(r.fileRow);
      else next.add(r.fileRow);
      setSelected(next);
    };
    return (
      <Screen
        title="Review before saving"
        back
        footer={
          <>
            <Button
              label={selectedCount ? `Import ${selectedCount} record${selectedCount === 1 ? '' : 's'}` : 'Select rows to import'}
              disabled={selectedCount === 0}
              onPress={() => {
                try {
                  const j = commitImport({ fileName: loaded.fileName, fileHash: loaded.fileHash, sourceId: sourceId!, rows: preview.rows, selected });
                  setJob(j);
                  setStep('done');
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Import failed. Nothing was saved.');
                }
              }}
            />
            <Button label="Change column matching" variant="text" onPress={() => setStep('map')} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {(
            [
              ['valid', 'Ready', preview.valid, color.success],
              ['duplicate', 'Likely duplicates', preview.duplicates, color.warning],
              ['invalid', 'Problems', preview.invalid, color.danger],
            ] as const
          ).map(([key, label, n, c]) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === key }}
              accessibilityLabel={`${label}: ${n}`}
              onPress={() => setFilter(key)}
              style={{ flex: 1, borderWidth: 1, borderColor: filter === key ? c : color.borderSubtle, borderRadius: 14, padding: space[3], backgroundColor: color.surface }}
            >
              <AppText variant="heading2" style={{ color: c }}>
                {n}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
        {filter === 'duplicate' && <AppText variant="bodySmall" tone="secondary">{DUPLICATE_RULE_TEXT}</AppText>}
        {filter === 'invalid' && preview.invalid > 0 && (
          <AppText variant="bodySmall" tone="secondary">
            These rows can’t be imported as they are. Fix them in the file and import again, or change the column matching. Rows you import now will be recognised next time, so they won’t be added twice.
          </AppText>
        )}
        {filter !== 'invalid' && rows.length > 0 && (
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Chip label="Select all shown" onPress={() => setSelected(new Set([...selected, ...rows.map((r) => r.fileRow)]))} />
            <Chip
              label="Clear shown"
              onPress={() => {
                const next = new Set(selected);
                rows.forEach((r) => next.delete(r.fileRow));
                setSelected(next);
              }}
            />
          </View>
        )}
        {error ? <Banner tone="danger" icon="alert-circle-outline" text={error} /> : null}
        <Card style={{ gap: 0, paddingVertical: space[2] }}>
          {rows.length === 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              No rows here.
            </AppText>
          ) : (
            rows.slice(0, 300).map((r, i) => {
              const isOn = selected.has(r.fileRow) && r.status !== 'invalid';
              return (
                <View key={r.fileRow}>
                  {i > 0 && <Divider />}
                  <Pressable
                    accessibilityRole={r.status === 'invalid' ? 'text' : 'checkbox'}
                    accessibilityState={r.status === 'invalid' ? undefined : { checked: isOn }}
                    onPress={() => toggle(r)}
                    style={{ flexDirection: 'row', gap: space[3], paddingVertical: space[3], alignItems: 'flex-start', minHeight: 56 }}
                  >
                    <Ionicons
                      name={r.status === 'invalid' ? 'close-circle-outline' : isOn ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={r.status === 'invalid' ? color.danger : isOn ? color.brandLavender : color.textSecondary}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyEmphasis" numberOfLines={1}>
                        {r.description || (r.categoryId ? categoryName(r.categoryId) : `Row ${r.fileRow}`)}
                      </AppText>
                      <AppText variant="bodySmall" tone="secondary">
                        Row {r.fileRow}
                        {r.date ? ` · ${formatDate(r.date)}` : ''}
                        {r.categoryId ? ` · ${categoryName(r.categoryId)}${r.categoryMatched ? '' : ' (default)'}` : ''}
                      </AppText>
                      {r.duplicateReason ? (
                        <AppText variant="bodySmall" tone="warning">
                          {r.duplicateReason}
                        </AppText>
                      ) : null}
                      {r.errors.map((e) => (
                        <AppText key={e} variant="bodySmall" tone="danger">
                          {e}
                        </AppText>
                      ))}
                    </View>
                    {r.amountMinor !== null && r.direction ? (
                      <AppText variant="money" tone={r.direction === 'income' ? 'success' : 'expense'}>
                        {formatMoney(r.direction === 'income' ? r.amountMinor : -r.amountMinor, { showSign: true, currency })}
                      </AppText>
                    ) : null}
                  </Pressable>
                </View>
              );
            })
          )}
          {rows.length > 300 ? (
            <AppText variant="caption" tone="muted">
              Showing the first 300 of {rows.length}. “Select all shown” includes only these.
            </AppText>
          ) : null}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Import finished" footer={<Button label="See your records" onPress={() => router.replace('/(tabs)/activity')} />}>
      <Card>
        <Ionicons name="checkmark-circle" size={40} color={color.success} />
        <AppText variant="heading2">{job?.committedCount ?? 0} records saved</AppText>
        <AppText tone="secondary">
          From {loaded.fileName}. {job && job.skippedCount > 0 ? `${job.skippedCount} rows were not imported (not selected, duplicates or problems).` : ''}
        </AppText>
        <AppText variant="bodySmall" tone="muted">
          Imported records are marked “Imported” in Activity. You can open any of them to edit or delete. Importing this file again will not create copies.
        </AppText>
      </Card>
      <Button label="Import another file" variant="secondary" onPress={() => { setLoaded(null); setMapping(null); setJob(null); setStep('choose'); }} />
    </Screen>
  );
}
