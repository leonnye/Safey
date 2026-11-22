import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DateField, Money, MoneyField, useMoneyInput } from '@/components/finance';
import { AppText, Button, Card, Field, ListRow, Picker, Screen } from '@/components/ui';
import { SOURCE_KIND_OPTIONS } from '@/copy/sources';
import { formatDate } from '@/domain/dates';
import { sourceBalance } from '@/domain/engine/summary';
import type { SourceKind } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';

export default function SourceEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, today, saveSource, setSourceArchived } = useStore();
  const existing = id !== 'new' ? data.sources.find((s) => s.id === id) : undefined;
  const [kind, setKind] = useState<SourceKind>(existing?.kind ?? 'cash');
  const [label, setLabel] = useState(existing?.label ?? 'Cash');
  const opening = useMoneyInput(existing?.openingBalanceMinor, true);
  const [openingDate, setOpeningDate] = useState(existing?.openingDate ?? today);
  const [error, setError] = useState<string | null>(null);
  const balance = existing ? sourceBalance(existing, data.transactions, today) : null;

  const save = () => {
    setError(null);
    if (opening.minor === null) {
      setError('Enter a starting balance (0 is fine).');
      return;
    }
    try {
      saveSource({ id: existing?.id, label, kind, openingBalanceMinor: opening.minor, openingDate });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <Screen
      title={existing ? 'Edit source' : 'Add a source'}
      back
      footer={
        <>
          <Button label="Save" onPress={save} />
          {existing && (
            <Button
              label={existing.isArchived ? 'Restore source' : 'Archive source'}
              variant="secondary"
              onPress={() => {
                setSourceArchived(existing.id, !existing.isArchived);
                router.back();
              }}
              accessibilityHint="Archived sources keep their records but are left out of your balance"
            />
          )}
        </>
      }
    >
      <Picker
        label="Type"
        value={kind}
        options={SOURCE_KIND_OPTIONS}
        onChange={(v) => {
          const k = v as SourceKind;
          setKind(k);
          if (!existing) setLabel(SOURCE_KIND_OPTIONS.find((o) => o.value === k)?.defaultLabel ?? '');
        }}
      />
      <Field label="Name" value={label} onChangeText={setLabel} maxLength={40} helper="For example “MoMo wallet” or “Savings box”." />
      <MoneyField label="Starting balance" input={opening} helper="What was there on the start date. Records from this date on are added to it." />
      <DateField label="Start date" value={openingDate} onChange={setOpeningDate} today={today} allowFuture={false} />
      {error ? <AppText tone="danger">{error}</AppText> : null}
      {balance && (
        <Card>
          <AppText variant="heading3">How this balance is worked out</AppText>
          <ListRow title="Starting balance" subtitle={formatDate(balance.openingDate)} right={<Money minor={balance.openingBalanceMinor} />} />
          <ListRow title="Money in since then" right={<Money minor={balance.inflowMinor} tone="success" />} />
          <ListRow title="Money out since then" right={<Money minor={-balance.outflowMinor} tone="expense" />} />
          <ListRow title="Recorded balance" subtitle={`As of ${formatDate(today)}`} right={<Money minor={balance.balanceMinor} />} />
          {balance.recordsBeforeOpening > 0 && (
            <AppText variant="bodySmall" tone="muted">
              {balance.recordsBeforeOpening} record{balance.recordsBeforeOpening === 1 ? ' is' : 's are'} dated before the start date. They stay in your history but are not added again, because the starting balance already includes them.
            </AppText>
          )}
          {balance.futureRecords > 0 && (
            <AppText variant="bodySmall" tone="muted">
              {balance.futureRecords} future-dated record{balance.futureRecords === 1 ? '' : 's'} will count from their date.
            </AppText>
          )}
        </Card>
      )}
    </Screen>
  );
}
