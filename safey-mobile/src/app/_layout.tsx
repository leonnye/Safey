import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/store/StoreProvider';
import { color } from '@/theme/tokens';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: color.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={color.brandLavender} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.canvas }, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="planned/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="budget/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="source/[id]" options={{ presentation: 'modal' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
