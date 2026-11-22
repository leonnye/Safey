import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { confirmAction } from '@/components/confirm';
import { DateField, MoneyField, useCurrency, useMoneyInput } from '@/components/finance';
import { AppText, Banner, Button, Field, Picker, Screen, Segmented } from '@/components/ui';
import { fallbackCategoryId } from '@/domain/categories';
import { formatDate } from '@/domain/dates';
import type { Direction } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';
import { space } from '@/theme/tokens';

export default function TransactionEditor() {
  const params = useLocalSearchParams<{ id: string; direction?: Direction }>();
  const { data, today, addTransaction, updateTransaction, deleteTransaction, restoreTransaction } = useStore();
  const existing = params.id !== 'new' ? data.transactions.find((t) => t.id === params.id) : undefined;
  const { format } = useCurrency();
  const activeSources = data.sources.filter((s) => !s.isArchived || s.id === existing?.sourceId);

  const [direction, setDirection] = useState<Direction>(existing?.direction ?? params.direction ?? 'expense');
  const amount = useMoneyInput(existing?.amountMinor);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? fallbackCategoryId(direction));
  const [sourceId, setSourceId] = useState<string | null>(existing?.sourceId ?? activeSources[0]?.id ?? null);
  const [date, setDate] = useState(existing?.date ?? today);
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [deleted, setDeleted] = useState<ReturnType<typeof deleteTransaction>>(null);

  if (params.id !== 'new' && !existing && !deleted) {
    return (
      <Screen title="Record not found" back>
        <AppText tone="secondary">This record may have been deleted.</AppText>
      </Screen>
    );
  }

  if (deleted) {
    return (
      <Screen title="Record deleted" back>
        <Banner tone="info" icon="trash-outline" text={`The ${deleted.direction} of ${format(deleted.amountMinor)} on ${formatDate(deleted.date)} was removed.`} />
        <Button
          label="Undo"
          variant="secondary"
          onPress={() => {
            restoreTransaction(deleted);
            setDeleted(null);
          }}
        />
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  const categories = data.categories.filter((c) => c.direction === direction && (c.isActive || c.id === categoryId));
  const source = data.sources.find((s) => s.id === sourceId);
  const beforeOpening = source && date < source.openingDate;

  const save = () => {
    setSubmitted(true);
    setError(null);
    if (amount.minor === null || !sourceId) return;
    try {
      const draft = { direction, amountMinor: amount.minor, categoryId, sourceId, date, note };
      if (existing) updateTransaction(existing.id, draft);
      else addTransaction(draft);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this record.');
    }
  };

  if (data.sources.length === 0) {
    return (
      <Screen title="Add a record" back>
        <AppText tone="secondary">First add where your money is, such as cash or a Mobile Money wallet you track yourself.</AppText>
        <Button label="Add a money source" onPress={() => router.replace({ pathname: '/source/[id]', params: { id: 'new' } })} />
      </Screen>
    );
  }

  return (
    <Screen
      title={existing ? 'Edit record' : direction === 'income' ? 'Add income' : 'Add expense'}
      back
      footer={
        <>
          <Button label={existing ? 'Save changes' : 'Save'} onPress={save} />
          {existing && (
            <Button
              label="Delete record"
              variant="danger"
              onPress={() =>
                confirmAction('Delete this record?', 'Your balance and estimates will be recalculated. You can undo straight after.', 'Delete', () => setDeleted(deleteTransaction(existing.id)))
              }
            />
          )}
        </>
      }
    >
      <Segmented
        label="Type"
        value={direction}
        onChange={(d) => {
          setDirection(d);
          setCategoryId(fallbackCategoryId(d));
        }}
        options={[
          { value: 'expense', label: 'Expense (money out)' },
          { value: 'income', label: 'Income (money in)' },
        ]}
      />
      <MoneyField label="Amount" input={amount} required={submitted && amount.minor === null && !amount.error ? 'Enter an amount.' : null} helper={direction === 'income' ? 'Money you received' : 'Money you spent or paid'} />
      <Picker label="Category" value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      <Picker
        label="Where did the money move?"
        value={sourceId}
        onChange={setSourceId}
        options={activeSources.map((s) => ({ value: s.id, label: s.label }))}
        error={submitted && !sourceId ? 'Choose a source.' : null}
      />
      <DateField label="Date" value={date} onChange={setDate} today={today} helper="Ghana time" />
      {beforeOpening ? (
        <Banner
          tone="warning"
          icon="information-circle-outline"
          text={`This date is before ${source!.label}'s starting balance (${formatDate(source!.openingDate)}), so it is kept as history and does not change the balance.`}
        />
      ) : null}
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Makola market, trotro to Circle" maxLength={200} />
      {existing?.origin === 'csv' ? (
        <AppText variant="caption" tone="muted">
          Imported from a CSV file. Editing here changes only this record.
        </AppText>
      ) : null}
      {error ? (
        <View accessibilityLiveRegion="polite">
          <AppText tone="danger">{error}</AppText>
        </View>
      ) : null}
      <View style={{ height: space[4] }} />
    </Screen>
  );
}
