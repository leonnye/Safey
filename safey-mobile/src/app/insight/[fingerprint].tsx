import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { AppText, Banner, Button, Card, Divider, ListRow, Screen, SeverityBadge } from '@/components/ui';
import { addDays, formatDate } from '@/domain/dates';
import type { Insight } from '@/domain/engine/warnings';
import { activeConsent } from '@/store/state';
import { useStore } from '@/store/StoreProvider';
import { useFinance } from '@/store/useFinance';
import { space } from '@/theme/tokens';

function runNextStep(step: Insight['nextStep']) {
  switch (step.action) {
    case 'open_plan':
      return router.push('/plan');
    case 'open_activity':
      return router.push({ pathname: '/activity', params: step.categoryId ? { categoryId: step.categoryId } : {} });
    case 'add_record':
      return router.push({ pathname: '/transaction/[id]', params: { id: 'new' } });
    case 'open_simulator':
      return router.push('/simulator');
    case 'open_sources':
      return router.push('/sources');
  }
}

export default function InsightDetail() {
  const { fingerprint } = useLocalSearchParams<{ fingerprint: string }>();
  const { data, today, setInsightState } = useStore();
  const { warnings } = useFinance();
  const insight = warnings.insights.find((i) => i.fingerprint === fingerprint);
  const aiOn = activeConsent(data.consents, 'ai_explanations') !== null;

  if (!insight) {
    return (
      <Screen title="Insight" back>
        <Card>
          <AppText variant="heading3">This no longer applies</AppText>
          <AppText tone="secondary">Your records or plans changed, and Safey recalculated. This signal is no longer showing.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Why am I seeing this?"
      back
      footer={
        <>
          <Button label={insight.nextStep.label} onPress={() => runNextStep(insight.nextStep)} />
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Button
              label="Snooze 7 days"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                setInsightState(insight.fingerprint, 'snoozed', addDays(today, 7));
                router.back();
              }}
            />
            <Button
              label="Dismiss"
              variant="secondary"
              style={{ flex: 1 }}
              accessibilityHint="Hides this until the situation changes"
              onPress={() => {
                setInsightState(insight.fingerprint, 'dismissed');
                router.back();
              }}
            />
          </View>
        </>
      }
    >
      <SeverityBadge severity={insight.severity} />
      <AppText variant="heading2">{insight.title}</AppText>
      <AppText tone="secondary">{insight.observation}</AppText>

      <Card>
        <AppText variant="heading3">What Safey looked at</AppText>
        <AppText variant="caption" tone="muted">
          {formatDate(insight.period.start)} – {formatDate(insight.period.end)}
        </AppText>
        {insight.evidence.map((e, i) => (
          <View key={`${e.label}-${i}`}>
            {i > 0 && <Divider />}
            <ListRow title={e.label} right={<AppText variant="money" style={{ maxWidth: 180, textAlign: 'right' }}>{e.value}</AppText>} />
          </View>
        ))}
        <AppText variant="bodySmall" tone="secondary">
          {insight.dataBasis}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading3">How this check works</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {insight.ruleDescription}
        </AppText>
        <AppText variant="caption" tone="muted">
          Rule {insight.ruleId} · version {insight.ruleVersion}. Thresholds are starting values that will be tuned with users.
        </AppText>
      </Card>

      <Banner tone="info" icon="information-circle-outline" text={insight.caveat} />

      <Card>
        <AppText variant="heading3">Something wrong?</AppText>
        <AppText variant="bodySmall" tone="secondary">
          If a record, bill or balance is wrong, fix it and Safey will recalculate. This is not a credit, fraud or health decision.
        </AppText>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Button label="Records" variant="text" onPress={() => router.push('/activity')} />
          <Button label="Plans" variant="text" onPress={() => router.push('/plan')} />
          <Button label="Sources" variant="text" onPress={() => router.push('/sources')} />
        </View>
      </Card>

      <Card>
        <AppText variant="heading3">AI explanation</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {aiOn
            ? 'You have allowed AI explanations, but this version has no secure server to send them through, so none is shown. The explanation above is calculated on this device.'
            : 'AI explanations are off. The explanation above is calculated on this device from your records.'}
        </AppText>
      </Card>
    </Screen>
  );
}
