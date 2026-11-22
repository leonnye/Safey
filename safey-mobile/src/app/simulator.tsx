import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { confirmAction } from '@/components/confirm';
import { DateField, Money, MoneyField, useCurrency, useMoneyInput } from '@/components/finance';
import { ProjectionChart } from '@/components/ProjectionChart';
import { AppText, Banner, Button, Card, Chip, Field, Picker, Screen, SectionHeader, Segmented } from '@/components/ui';
import { addDays, formatDate } from '@/domain/dates';
import { PROVISIONAL } from '@/domain/engine/config';
import type { Projection } from '@/domain/engine/projection';
import { simulate, TEMPLATE_LABELS } from '@/domain/engine/simulator';
import type { Direction, Frequency, ScenarioInputs, ScenarioTemplate } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';
import { useFinance } from '@/store/useFinance';
import { color, space } from '@/theme/tokens';

const TEMPLATE_HELP: Record<ScenarioTemplate, string> = {
  delayed_income: 'What if a payment you expect comes later?',
  one_off_expense: 'What if a single cost comes up, like a repair or a funeral contribution?',
  recurring_savings: 'What if you set aside a fixed amount each week or month?',
  custom_change: 'Any other change in money in or out.',
};

function Column({ title, p, tone }: { title: string; p: Projection; tone: string }) {
  const { format } = useCurrency();
  return (
    <Card style={{ flex: 1, borderColor: tone, minWidth: 150 }}>
      <AppText variant="caption" tone="secondary">
        {title}
      </AppText>
      <AppText variant="caption" tone="muted">
        Around {formatDate(p.end.date)}
      </AppText>
      <Money minor={p.end.centralMinor} variant="heading3" tone={p.end.centralMinor < 0 ? 'danger' : 'primary'} />
      <AppText variant="caption" tone="secondary">
        Range {format(p.end.lowMinor)} to {format(p.end.highMinor)}
      </AppText>
      <AppText variant="caption" tone="secondary">
        Lowest {format(p.lowestCentral.valueMinor)} on {formatDate(p.lowestCentral.date)}
      </AppText>
    </Card>
  );
}

export default function Simulator() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId?: string }>();
  const { data, today, saveScenario, deleteScenario } = useStore();
  const { position, coverage } = useFinance();
  const saved = scenarioId ? data.scenarios.find((s) => s.id === scenarioId) : undefined;
  const init = saved?.inputs;

  const [template, setTemplate] = useState<ScenarioTemplate>(init?.template ?? 'one_off_expense');
  const [horizon, setHorizon] = useState<number>(saved?.horizonDays ?? PROVISIONAL.projection.defaultHorizonDays);
  const amount = useMoneyInput(init && 'amountMinor' in init ? init.amountMinor : undefined);
  const [date, setDate] = useState(init?.template === 'one_off_expense' ? init.date : init && 'startDate' in init ? init.startDate : addDays(today, 7));
  const [label, setLabel] = useState(init && 'label' in init ? init.label : '');
  const [plannedItemId, setPlannedItemId] = useState<string | null>(init?.template === 'delayed_income' ? init.plannedItemId : null);
  const [delayText, setDelayText] = useState(init?.template === 'delayed_income' ? String(init.delayDays) : '7');
  const [savingsFreq, setSavingsFreq] = useState<'weekly' | 'monthly'>(init?.template === 'recurring_savings' ? init.frequency : 'weekly');
  const [customDirection, setCustomDirection] = useState<Direction>(init?.template === 'custom_change' ? init.direction : 'expense');
  const [customFreq, setCustomFreq] = useState<Frequency>(init?.template === 'custom_change' ? init.frequency : 'weekly');
  const [name, setName] = useState(saved?.name ?? '');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const incomeItems = data.plannedItems.filter((p) => p.direction === 'income' && p.isActive);
  const { format } = useCurrency();
  const hasSources = data.sources.some((s) => !s.isArchived);

  const inputs: ScenarioInputs | null = useMemo(() => {
    switch (template) {
      case 'delayed_income':
        return plannedItemId ? { template, plannedItemId, delayDays: Number.parseInt(delayText, 10) || 0 } : null;
      case 'one_off_expense':
        return amount.minor ? { template, amountMinor: amount.minor, date, label } : null;
      case 'recurring_savings':
        return amount.minor ? { template, amountMinor: amount.minor, startDate: date, frequency: savingsFreq } : null;
      case 'custom_change':
        return amount.minor ? { template, label, direction: customDirection, amountMinor: amount.minor, startDate: date, frequency: customFreq } : null;
    }
  }, [template, plannedItemId, delayText, amount.minor, date, label, savingsFreq, customDirection, customFreq]);

  const result = useMemo(
    () =>
      inputs && hasSources
        ? simulate({ today, horizonDays: horizon, startBalanceMinor: position.totalMinor, plannedItems: data.plannedItems, transactions: data.transactions, scenario: inputs })
        : null,
    [inputs, hasSources, today, horizon, position.totalMinor, data.plannedItems, data.transactions],
  );

  const reset = () => {
    amount.setText('');
    setLabel('');
    setDate(addDays(today, 7));
    setPlannedItemId(null);
    setDelayText('7');
    setSavedMsg(null);
  };

  if (!hasSources) {
    return (
      <Screen title="Future Self Simulator" back>
        <Banner tone="info" icon="wallet-outline" text="Add a money source with a starting balance first. The simulator starts from your recorded balance." />
        <Button label="Add a money source" onPress={() => router.push({ pathname: '/source/[id]', params: { id: 'new' } })} />
      </Screen>
    );
  }

  return (
    <Screen title="Future Self Simulator" back>
      <AppText variant="bodySmall" tone="secondary">
        A planning tool for learning, not a promise or advice. Nothing here moves money or changes your records.
      </AppText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {(Object.keys(TEMPLATE_LABELS) as ScenarioTemplate[]).map((t) => (
          <Chip
            key={t}
            label={TEMPLATE_LABELS[t]}
            selected={template === t}
            onPress={() => {
              setTemplate(t);
              setSavedMsg(null);
            }}
          />
        ))}
      </View>
      <AppText variant="bodySmall" tone="secondary">
        {TEMPLATE_HELP[template]}
      </AppText>

      <Card>
        {template === 'delayed_income' ? (
          incomeItems.length === 0 ? (
            <>
              <AppText variant="bodySmall" tone="secondary">
                Add income you expect in Plan first, then come back to see what a delay would mean.
              </AppText>
              <Button label="Add expected income" variant="secondary" onPress={() => router.push({ pathname: '/planned/[id]', params: { id: 'new', direction: 'income' } })} />
            </>
          ) : (
            <>
              <Picker label="Which expected income?" value={plannedItemId} onChange={setPlannedItemId} options={incomeItems.map((p) => ({ value: p.id, label: p.label, description: `${format(p.amountMinor)} · ${formatDate(p.dueDate)}` }))} />
              <Field label="How many days later?" value={delayText} onChangeText={setDelayText} keyboardType="number-pad" inputMode="numeric" maxLength={3} helper="1 to 120 days" />
            </>
          )
        ) : (
          <>
            {template === 'custom_change' && (
              <Segmented
                label="Direction"
                value={customDirection}
                onChange={setCustomDirection}
                options={[
                  { value: 'expense', label: 'Extra money out' },
                  { value: 'income', label: 'Extra money in' },
                ]}
              />
            )}
            <MoneyField label={template === 'recurring_savings' ? 'Amount to set aside' : 'Amount'} input={amount} />
            {(template === 'one_off_expense' || template === 'custom_change') && <Field label="Label (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Phone repair" maxLength={40} />}
            <DateField label={template === 'one_off_expense' ? 'When' : 'Starting'} value={date} onChange={setDate} today={today} />
            {template === 'recurring_savings' && (
              <Segmented
                label="How often"
                value={savingsFreq}
                onChange={setSavingsFreq}
                options={[
                  { value: 'weekly', label: 'Every week' },
                  { value: 'monthly', label: 'Every month' },
                ]}
              />
            )}
            {template === 'custom_change' && (
              <Segmented
                label="How often"
                value={customFreq}
                onChange={setCustomFreq}
                options={[
                  { value: 'once', label: 'Once' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            )}
          </>
        )}
        <Segmented
          label="Look ahead"
          value={String(horizon)}
          onChange={(v) => setHorizon(Number(v))}
          options={PROVISIONAL.projection.allowedHorizons.map((h) => ({ value: String(h), label: `${h} days` }))}
        />
      </Card>

      {result?.error ? <Banner tone="warning" icon="alert-circle-outline" text={result.error} /> : null}

      {result && !result.error && (
        <>
          <SectionHeader title="Baseline and scenario" />
          <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
            <Column title="Baseline (estimate)" p={result.baseline} tone={color.chartRecorded} />
            <Column title="Scenario (estimate)" p={result.scenario} tone={color.chartScenario} />
          </View>
          <Card>
            <AppText variant="bodyEmphasis">
              By {formatDate(result.scenario.end.date)}, this scenario changes your estimate by {format(result.differenceAtEndMinor, { showSign: true })}.
            </AppText>
            <ProjectionChart baseline={result.baseline} scenario={result.scenario} thresholdMinor={data.profile?.bufferMinor || undefined} />
          </Card>
          <Card>
            <AppText variant="heading3">Assumptions</AppText>
            {[...result.scenarioAssumptions, ...result.baseline.assumptions].map((a) => (
              <AppText key={a} variant="bodySmall" tone="secondary">
                • {a}
              </AppText>
            ))}
            <AppText variant="caption" tone="muted">
              {coverage.description} Engine {result.engineVersion}. Change your records or plans and this updates.
            </AppText>
          </Card>
          <Card>
            <Field label="Save as" value={name} onChangeText={setName} placeholder={TEMPLATE_LABELS[template]} maxLength={40} />
            <Button
              label="Save scenario"
              variant="secondary"
              onPress={() => {
                saveScenario({ name: name.trim() || TEMPLATE_LABELS[template], inputs: inputs!, horizonDays: horizon, engineVersion: result.engineVersion });
                setSavedMsg('Saved. Find it under Plan → Saved scenarios.');
              }}
            />
            {savedMsg ? <AppText variant="bodySmall" tone="success">{savedMsg}</AppText> : null}
          </Card>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <Button label="Reset" variant="text" onPress={reset} />
        {saved && (
          <Button
            label="Delete saved scenario"
            variant="text"
            onPress={() =>
              confirmAction('Delete this scenario?', 'Only the saved scenario is removed.', 'Delete', () => {
                deleteScenario(saved.id);
                router.back();
              })
            }
          />
        )}
      </View>
    </Screen>
  );
}
