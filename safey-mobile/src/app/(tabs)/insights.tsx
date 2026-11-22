import { View } from 'react-native';
import { InsightCard } from '@/components/finance';
import { AppText, Button, Card, EmptyState, ListRow, Screen, SectionHeader } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { useFinance } from '@/store/useFinance';
import { space } from '@/theme/tokens';

export default function Insights() {
  const { data, setInsightState } = useStore();
  const { visible, warnings } = useFinance();
  const hidden = data.insightStates.filter((s) => warnings.insights.some((i) => i.fingerprint === s.fingerprint) && !visible.some((v) => v.fingerprint === s.fingerprint));

  return (
    <Screen title="Insights">
      <AppText variant="bodySmall" tone="secondary">
        Early signs worked out from the records and plans you entered. They are signals to look at, not judgements or predictions.
      </AppText>

      {visible.length === 0 ? (
        <EmptyState
          icon="leaf-outline"
          title="Nothing to flag right now"
          body={warnings.coverage.level === 'good' ? 'Based on your records, nothing needs a look at the moment.' : 'Safey has limited records to check. Some checks are waiting for more data — see below.'}
        />
      ) : (
        visible.map((i) => <InsightCard key={i.fingerprint} insight={i} />)
      )}

      {warnings.suppressed.length > 0 && (
        <View style={{ gap: space[2] }}>
          <SectionHeader title="Checks waiting for more records" />
          <Card style={{ gap: 0 }}>
            {warnings.suppressed.map((s) => (
              <ListRow key={s.ruleId} icon="hourglass-outline" title={s.title} subtitle={s.reason} />
            ))}
          </Card>
        </View>
      )}

      {hidden.length > 0 && (
        <View style={{ gap: space[2] }}>
          <SectionHeader title={`Dismissed or snoozed (${hidden.length})`} />
          <Button label="Show them again" variant="secondary" onPress={() => hidden.forEach((h) => setInsightState(h.fingerprint, null))} />
        </View>
      )}
    </Screen>
  );
}
