import { router } from 'expo-router';
import { View } from 'react-native';
import { Money } from '@/components/finance';
import { AppText, Button, Card, Divider, EmptyState, ListRow, Screen } from '@/components/ui';
import { SOURCE_KIND_ICON, SOURCE_KIND_LABEL } from '@/copy/sources';
import { formatDate } from '@/domain/dates';
import { sourceBalance } from '@/domain/engine/summary';
import { useStore } from '@/store/StoreProvider';
import { space } from '@/theme/tokens';

export default function Sources() {
  const { data, today } = useStore();
  const active = data.sources.filter((s) => !s.isArchived);
  const archived = data.sources.filter((s) => s.isArchived);

  return (
    <Screen title="Money sources" back footer={<Button label="Add a source" icon="add" onPress={() => router.push({ pathname: '/source/[id]', params: { id: 'new' } })} />}>
      <AppText variant="bodySmall" tone="secondary">
        These are records you keep. Safey is not connected to any bank or Mobile Money provider, so balances only change when you add records.
      </AppText>
      {active.length === 0 ? (
        <EmptyState icon="wallet-outline" title="No sources yet" body="Add cash, a Mobile Money wallet or a bank account you track yourself." />
      ) : (
        <Card style={{ gap: 0 }}>
          {active.map((s, i) => {
            const b = sourceBalance(s, data.transactions, today);
            return (
              <View key={s.id}>
                {i > 0 && <Divider />}
                <ListRow
                  icon={SOURCE_KIND_ICON[s.kind]}
                  title={s.label}
                  subtitle={`${SOURCE_KIND_LABEL[s.kind]} · started ${formatDate(s.openingDate)}`}
                  right={<Money minor={b.balanceMinor} tone={b.balanceMinor < 0 ? 'expense' : 'primary'} />}
                  onPress={() => router.push({ pathname: '/source/[id]', params: { id: s.id } })}
                  accessibilityLabel={`${s.label}, recorded balance`}
                />
              </View>
            );
          })}
        </Card>
      )}
      {archived.length > 0 && (
        <View style={{ gap: space[2] }}>
          <AppText variant="heading3">Archived</AppText>
          <Card style={{ gap: 0 }}>
            {archived.map((s) => (
              <ListRow key={s.id} icon={SOURCE_KIND_ICON[s.kind]} title={s.label} subtitle="Not counted in your balance" onPress={() => router.push({ pathname: '/source/[id]', params: { id: s.id } })} />
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}
