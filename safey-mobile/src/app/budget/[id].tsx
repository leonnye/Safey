import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { confirmAction } from '@/components/confirm';
import { MoneyField, useMoneyInput } from '@/components/finance';
import { AppText, Button, Picker, Screen, Segmented } from '@/components/ui';
import type { BudgetPeriod } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';

export default function BudgetEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveBudget, deleteBudget } = useStore();
  const existing = id !== 'new' ? data.budgets.find((b) => b.id === id) : undefined;
  const expenseCats = data.categories.filter((c) => c.direction === 'expense' && (c.isActive || c.id === existing?.categoryId));
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [period, setPeriod] = useState<BudgetPeriod>(existing?.period ?? 'month');
  const limit = useMoneyInput(existing?.limitMinor);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    if (!categoryId) return setError('Choose a category.');
    if (limit.minor === null) return setError('Enter an amount.');
    try {
      saveBudget({ id: existing?.id, categoryId, period, limitMinor: limit.minor });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <Screen
      title={existing ? 'Edit budget' : 'Add a budget'}
      back
      footer={
        <>
          <Button label="Save" onPress={save} />
          {existing && (
            <Button
              label="Delete budget"
              variant="danger"
              onPress={() =>
                confirmAction('Delete this budget?', 'Your records are not affected.', 'Delete', () => {
                  deleteBudget(existing.id);
                  router.back();
                })
              }
            />
          )}
        </>
      }
    >
      <Picker label="Category" value={categoryId} onChange={setCategoryId} options={expenseCats.map((c) => ({ value: c.id, label: c.name }))} />
      <Segmented
        label="Period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: 'Each week' },
          { value: 'month', label: 'Each month' },
        ]}
      />
      <MoneyField label="Amount you plan to spend" input={limit} helper="Weeks start on Monday. Months start on the 1st." />
      {error ? <AppText tone="danger">{error}</AppText> : null}
    </Screen>
  );
}
