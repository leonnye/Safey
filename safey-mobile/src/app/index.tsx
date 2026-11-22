import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Logo } from '@/components/finance';
import { AppText, Button, Card } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { color, space } from '@/theme/tokens';

export default function Entry() {
  const { status, loadError, data, deleteAllData } = useStore();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: color.canvas, alignItems: 'center', justifyContent: 'center', gap: space[5] }}>
        <Logo size={96} />
        <ActivityIndicator color={color.brandLavender} accessibilityLabel="Loading your records" />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: color.canvas, justifyContent: 'center', padding: space[5] }}>
        <Card>
          <AppText variant="heading2">Saved data could not be opened</AppText>
          <AppText tone="secondary">{loadError}</AppText>
          <AppText variant="bodySmall" tone="muted">
            Your data stays on this device until you remove it. Restarting the app may help. Starting fresh permanently erases what was saved.
          </AppText>
          <Button label="Erase and start fresh" variant="danger" onPress={() => void deleteAllData()} />
        </Card>
      </View>
    );
  }

  return <Redirect href={data.profile ? '/(tabs)' : '/onboarding'} />;
}
