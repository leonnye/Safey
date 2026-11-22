import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { useStore } from '@/store/StoreProvider';
import { useFinance } from '@/store/useFinance';
import { useResponsive } from '@/theme/responsive';
import { color, font, radius } from '@/theme/tokens';

export default function TabLayout() {
  const { data, status } = useStore();
  const { visible } = useFinance();
  const { wide, contentMax } = useResponsive();
  if (status === 'ready' && !data.profile) return <Redirect href="/onboarding" />;
  const urgent = visible.filter((i) => i.severity !== 'info').length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.canvas },
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.borderSubtle,
          minHeight: 64,
          paddingTop: 6,
          ...(wide
            ? {
                maxWidth: Math.min(720, contentMax),
                width: '100%',
                alignSelf: 'center',
                marginBottom: 12,
                borderTopLeftRadius: radius.card,
                borderTopRightRadius: radius.card,
                borderWidth: 1,
                borderColor: color.borderSubtle,
                overflow: 'hidden',
              }
            : null),
        },
        tabBarActiveTintColor: color.brandLavender,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarAccessibilityLabel: 'Home, where you stand', tabBarIcon: ({ color: c, size }) => <Ionicons name="home-outline" color={String(c)} size={size} /> }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: 'Activity', tabBarAccessibilityLabel: 'Activity, income and expense records', tabBarIcon: ({ color: c, size }) => <Ionicons name="list-outline" color={String(c)} size={size} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarAccessibilityLabel: 'Plan, bills, budgets and simulator', tabBarIcon: ({ color: c, size }) => <Ionicons name="calendar-outline" color={String(c)} size={size} /> }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarAccessibilityLabel: `Insights, early warnings${visible.length ? `, ${visible.length} to review` : ''}`,
          tabBarBadge: urgent > 0 ? urgent : undefined,
          tabBarBadgeStyle: { backgroundColor: color.warning, color: color.onBrand, fontFamily: font.semibold },
          tabBarIcon: ({ color: c, size }) => <Ionicons name="pulse-outline" color={String(c)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile, settings and privacy', tabBarIcon: ({ color: c, size }) => <Ionicons name="person-circle-outline" color={String(c)} size={size} /> }}
      />
    </Tabs>
  );
}
