import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { confirmAction } from '@/components/confirm';
import { DateField, MoneyField, useMoneyInput } from '@/components/finance';
import { AppText, Button, Field, Picker, Screen, Segmented, Toggle } from '@/components/ui';
import type { Direction, Frequency } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';

const NONE = '__none__';

export default function PlannedEditor() {
  const params = useLocalSearchParams<{ id: string; direction?: Direction }>();
  const { data, today, savePlannedItem, deletePlannedItem } = useStore();
  const existing = params.id !== 'new' ? data.plannedItems.find((p) => p.id === params.id) : undefined;
  const [direction, setDirection] = useState<Direction>(existing?.direction ?? params.direction ?? 'expense');
  const [label, setLabel] = useState(existing?.label ?? '');
  const amount = useMoneyInput(existing?.amountMinor);
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? today);
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'once');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [isActive, setActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const isBill = direction === 'expense';

  const save = () => {
    setError(null);
    if (amount.minor === null) {
      setError('Enter an amount.');
      return;
    }
    try {
      savePlannedItem({ id: existing?.id, label, direction, amountMinor: amount.minor, dueDate, frequency, categoryId, isActive });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <Screen
      title={existing ? 'Edit planned item' : isBill ? 'Add a bill' : 'Add expected income'}
      back
      footer={
        <>
          <Button label="Save" onPress={save} />
          {existing && (
            <Button
              label="Delete"
              variant="danger"
              onPress={() =>
                confirmAction('Delete this item?', 'Plans and warnings will no longer include it.', 'Delete', () => {
                  deletePlannedItem(existing.id);
                  router.back();
                })
              }
            />
          )}
        </>
      }
    >
      <Segmented
        label="Type"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'expense', label: 'Bill (money out)' },
          { value: 'income', label: 'Expected income' },
        ]}
      />
      <Field label="Name" value={label} onChangeText={setLabel} placeholder={isBill ? 'e.g. Rent, ECG prepaid, school fees' : 'e.g. Client payment, market sales'} maxLength={60} />
      <MoneyField label="Amount" input={amount} />
      <DateField label={frequency === 'once' ? 'Date' : 'First date'} value={dueDate} onChange={setDueDate} today={today} />
      <Segmented
        label="Repeats"
        value={frequency}
        onChange={setFrequency}
        options={[
          { value: 'once', label: 'Once' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />
      <Picker
        label="Category (optional)"
        value={categoryId ?? NONE}
        onChange={(v) => setCategoryId(v === NONE ? null : v)}
        options={[{ value: NONE, label: 'None' }, ...data.categories.filter((c) => c.direction === direction && c.isActive).map((c) => ({ value: c.id, label: c.name }))]}
      />
      {isBill && categoryId ? (
        <AppText variant="caption" tone="muted">
          Past spending in this category is left out of the everyday spending estimate, so this bill isn’t counted twice.
        </AppText>
      ) : null}
      {!isBill ? (
        <AppText variant="caption" tone="muted">
          Expected income is your own estimate. The cautious line in plans assumes it might not arrive.
        </AppText>
      ) : null}
      <Toggle label="Include in plans and warnings" value={isActive} onChange={setActive} />
      {error ? <AppText tone="danger">{error}</AppText> : null}
    </Screen>
  );
}
