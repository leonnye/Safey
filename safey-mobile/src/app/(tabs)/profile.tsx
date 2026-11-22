import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { confirmAction } from '@/components/confirm';
import { CurrencyChoice, Logo, MoneyField, useMoneyInput } from '@/components/finance';
import { shareTextFile } from '@/components/shareFile';
import { AppText, Banner, Button, Card, Divider, Field, ListRow, Screen, SectionHeader, Toggle } from '@/components/ui';
import { formatDate } from '@/domain/dates';
import { ENGINE_VERSION } from '@/domain/engine/config';
import { buildJsonExport, buildTransactionsCsv } from '@/domain/export';
import { formatMoney } from '@/domain/money';
import type { CurrencyCode } from '@/domain/types';
import { activeConsent } from '@/store/state';
import { useStore } from '@/store/StoreProvider';
import { space } from '@/theme/tokens';

export default function Profile() {
  const { data, updateProfile, setConsent, deleteAllData, today } = useStore();
  const profile = data.profile;
  const [name, setName] = useState(profile?.displayName ?? '');
  const buffer = useMoneyInput(profile?.bufferMinor ?? 0, true);
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const ai = activeConsent(data.consents, 'ai_explanations');
  const isDemo = profile?.mode === 'demo';
  const aiHistory = data.consents.filter((c) => c.purpose === 'ai_explanations');

  const doExport = async (kind: 'json' | 'csv') => {
    setBusy(kind);
    setMessage(null);
    try {
      const stamp = today;
      const result =
        kind === 'json'
          ? await shareTextFile(`safey-export-${stamp}.json`, buildJsonExport(data, new Date().toISOString()), 'application/json')
          : await shareTextFile(`safey-transactions-${stamp}.csv`, buildTransactionsCsv(data.transactions, data.categories, data.sources), 'text/csv');
      setMessage({ tone: 'info', text: result === 'downloaded' ? 'Export downloaded.' : 'Export ready. Choose where to save or send it.' });
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error ? e.message : 'Export failed. Try again.' });
    } finally {
      setBusy(null);
    }
  };

  const erase = () =>
    confirmAction(
      isDemo ? 'Leave demo mode?' : 'Delete all your data?',
      isDemo
        ? 'The sample records are removed and you can set up Safey with your own records.'
        : 'Every record, source, plan and setting is permanently removed from this device. Export first if you want a copy. This cannot be undone.',
      isDemo ? 'Leave demo' : 'Delete everything',
      () => {
        void deleteAllData().then(() => router.replace('/onboarding'));
      },
    );

  return (
    <Screen title="Profile">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Logo size={48} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading3">{profile?.displayName || 'Your profile'}</AppText>
          <AppText variant="caption" tone="secondary">
            {isDemo ? 'Demo mode · sample data' : `Using Safey since ${profile ? formatDate(profile.createdAt.slice(0, 10)) : ''}`}
          </AppText>
        </View>
      </View>

      {message ? <Banner tone={message.tone} icon={message.tone === 'info' ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={message.text} /> : null}

      <SectionHeader title="You" />
      <Card>
        <Field label="Name" value={name} onChangeText={setName} maxLength={40} />
        <MoneyField label="Money you'd like to keep aside" input={buffer} helper="Warnings use this as your buffer." />
        <Button
          label="Save"
          variant="secondary"
          disabled={buffer.minor === null}
          onPress={() => {
            updateProfile({ displayName: name.trim(), bufferMinor: buffer.minor ?? 0 });
            setMessage({ tone: 'info', text: 'Saved.' });
          }}
        />
      </Card>

      <SectionHeader title="Currency" />
      <Card>
        <CurrencyChoice
          value={profile?.defaultCurrency ?? 'GHS'}
          onChange={(next: CurrencyCode) => {
            const current = profile?.defaultCurrency ?? 'GHS';
            if (next === current) return;
            const apply = () => {
              updateProfile({ defaultCurrency: next });
              setMessage({ tone: 'info', text: `New amounts are saved in ${next}. Existing numbers were not converted.` });
            };
            const hasAmounts = data.transactions.length > 0 || data.plannedItems.length > 0 || data.budgets.length > 0 || data.sources.some((s) => s.openingBalanceMinor > 0);
            if (!hasAmounts) apply();
            else {
              confirmAction(
                `Save amounts in ${next}?`,
                `This does not convert money. ${formatMoney(20000, { currency: current })} will be shown as ${formatMoney(20000, { currency: next })}.`,
                'Change currency',
                apply,
              );
            }
          }}
        />
        <AppText variant="bodySmall" tone="secondary">
          Choose Ghana cedi or US dollar. Every balance, record, bill and budget uses the currency you pick.
        </AppText>
      </Card>

      <SectionHeader title="Region" />
      <Card style={{ gap: 0 }}>
        <ListRow icon="time-outline" title="Time zone" subtitle={profile?.timezone ?? 'Africa/Accra'} />
        <Divider />
        <ListRow icon="language-outline" title="Language" subtitle="English (Ghana)" />
      </Card>

      <SectionHeader title="Privacy & AI" />
      <Card>
        <AppText variant="bodySmall" tone="secondary">
          Your records are stored only on this device. There is no Safey account or server in this version, and nothing is sent anywhere unless you export it.
        </AppText>
        <Toggle
          label="Allow AI explanations"
          description="Optional. If turned on, a future version could send a small, anonymised summary of calculated results to an AI service — only when you ask for an explanation. This version has no AI service connected, so nothing is sent."
          value={ai !== null}
          onChange={(v) => setConsent('ai_explanations', v)}
        />
        {aiHistory.length > 0 && (
          <View style={{ gap: 2 }}>
            <AppText variant="caption" tone="secondary">
              Consent history
            </AppText>
            {aiHistory.map((c) => (
              <AppText key={c.id} variant="caption" tone="muted">
                Allowed {formatDate(c.grantedAt.slice(0, 10))} (policy {c.policyVersion}){c.revokedAt ? ` · turned off ${formatDate(c.revokedAt.slice(0, 10))}` : ''}
              </AppText>
            ))}
          </View>
        )}
      </Card>

      <SectionHeader title="Notifications" />
      <Card>
        <AppText variant="bodySmall" tone="secondary">
          Notifications are off. This version shows warnings only inside the app, on the Insights tab.
        </AppText>
      </Card>

      <SectionHeader title="Plan" />
      <Card>
        <AppText variant="bodyEmphasis">All features are free in this version</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Premium plans are not available yet. Before any purchase, Safey will show the price, billing period, trial terms and how to cancel. Export and delete will always stay free.
        </AppText>
      </Card>

      <SectionHeader title="Your data" />
      <Card>
        <Button label="Export everything (JSON)" icon="download-outline" variant="secondary" loading={busy === 'json'} onPress={() => void doExport('json')} />
        <Button label="Export records (CSV)" icon="document-text-outline" variant="secondary" loading={busy === 'csv'} onPress={() => void doExport('csv')} />
        <AppText variant="caption" tone="muted">
          JSON includes everything, with amounts in pesewas. CSV lists your records for spreadsheets; cells that look like formulas are made safe.
        </AppText>
        <Divider />
        <Button label={isDemo ? 'Leave demo mode' : 'Delete all data'} icon="trash-outline" variant="danger" onPress={erase} />
        <AppText variant="caption" tone="muted">
          Deleting removes everything from this device straight away. Copies you exported or device backups you made are not affected.
        </AppText>
      </Card>

      <SectionHeader title="About" />
      <Card>
        <AppText variant="bodySmall" tone="secondary">
          Safey is a planning companion, not a bank, lender or financial adviser. Estimates depend on the records you provide and are not guarantees.
        </AppText>
        <AppText variant="caption" tone="muted">
          App 1.0.0 · Calculation {ENGINE_VERSION} · Storage: this device only
        </AppText>
      </Card>
    </Screen>
  );
}
