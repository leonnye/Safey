import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Money, useCurrency } from '@/components/finance';
import { AppText, Button, Card, Divider, ListRow, Screen, SectionHeader, Tag } from '@/components/ui';
import { formatDate, startOfMonth, startOfWeek } from '@/domain/dates';
import { TEMPLATE_LABELS } from '@/domain/engine/simulator';
import { periodSummary } from '@/domain/engine/summary';
import type { Frequency } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';
import { useCategoryName } from '@/store/useFinance';
import { color, radius, space } from '@/theme/tokens';

const FREQUENCY_LABEL: Record<Frequency, string> = { once: 'Once', weekly: 'Every week', monthly: 'Every month' };

export default function Plan() {
  const { data, today } = useStore();
  const categoryName = useCategoryName();
  const { format } = useCurrency();
  const bills = data.plannedItems.filter((p) => p.direction === 'expense').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const income = data.plannedItems.filter((p) => p.direction === 'income').sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const plannedRow = (p: (typeof bills)[number], i: number) => (
    <View key={p.id}>
      {i > 0 && <Divider />}
      <ListRow
        icon={p.direction === 'income' ? 'arrow-down-circle-outline' : 'receipt-outline'}
        title={p.label}
        subtitle={`${FREQUENCY_LABEL[p.frequency]} · ${p.frequency === 'once' ? '' : 'from '}${formatDate(p.dueDate)}${!p.isActive ? ' · paused' : p.frequency === 'once' && p.dueDate < today ? ' · date passed' : ''}`}
        right={<Money minor={p.amountMinor} tone={p.direction === 'income' ? 'success' : 'expense'} />}
        onPress={() => router.push({ pathname: '/planned/[id]', params: { id: p.id } })}
      />
    </View>
  );

  return (
    <Screen title="Plan">
      <Card raised style={{ borderColor: color.brandViolet }}>
        <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.control, backgroundColor: color.brandViolet, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="telescope-outline" size={24} color={color.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading3">Future Self Simulator</AppText>
            <AppText variant="bodySmall" tone="secondary">
              See how a “what if” could change the weeks ahead.
            </AppText>
          </View>
        </View>
        <Button label="Try a scenario" onPress={() => router.push('/simulator')} />
      </Card>

      <View style={{ gap: space[2] }}>
        <SectionHeader title="Bills you expect" action={{ label: 'Add bill', onPress: () => router.push({ pathname: '/planned/[id]', params: { id: 'new', direction: 'expense' } }) }} />
        <Card style={{ gap: 0 }}>
          {bills.length ? bills.map(plannedRow) : <AppText variant="bodySmall" tone="secondary">Add rent, school fees, utilities or other bills so plans and warnings can include them.</AppText>}
        </Card>
      </View>

      <View style={{ gap: space[2] }}>
        <SectionHeader title="Income you expect" action={{ label: 'Add income', onPress: () => router.push({ pathname: '/planned/[id]', params: { id: 'new', direction: 'income' } }) }} />
        <Card style={{ gap: 0 }}>
          {income.length ? (
            income.map(plannedRow)
          ) : (
            <AppText variant="bodySmall" tone="secondary">
              Irregular income is fine. Add a payment only when you have a reasonable idea of when it may arrive. Safey never assumes a salary.
            </AppText>
          )}
        </Card>
      </View>

      <View style={{ gap: space[2] }}>
        <SectionHeader title="Budgets" action={{ label: 'Add budget', onPress: () => router.push({ pathname: '/budget/[id]', params: { id: 'new' } }) }} />
        <Card>
          {data.budgets.length === 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              Set a weekly or monthly amount for a category, like food or transport, and track recorded spending against it.
            </AppText>
          ) : (
            data.budgets.map((b) => {
              const start = b.period === 'week' ? startOfWeek(today) : startOfMonth(today);
              const spent = periodSummary(data.transactions, start, today).expenseByCategory.find((c) => c.categoryId === b.categoryId)?.totalMinor ?? 0;
              const pct = Math.min(100, Math.floor((spent * 100) / b.limitMinor));
              const over = spent > b.limitMinor;
              return (
                <View key={b.id} style={{ gap: space[2] }}>
                  <ListRow
                    title={categoryName(b.categoryId)}
                    subtitle={`${format(spent)} of ${format(b.limitMinor)} this ${b.period}`}
                    right={<Tag label={over ? 'Over' : `${pct}%`} tone={over ? 'warning' : pct >= 80 ? 'warning' : 'success'} />}
                    onPress={() => router.push({ pathname: '/budget/[id]', params: { id: b.id } })}
                  />
                  <View
                    style={{ height: 8, borderRadius: radius.pill, backgroundColor: color.borderSubtle, overflow: 'hidden' }}
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: pct }}
                  >
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: over ? color.warning : color.brandLavender }} />
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </View>

      {data.scenarios.length > 0 && (
        <View style={{ gap: space[2] }}>
          <SectionHeader title="Saved scenarios" />
          <Card style={{ gap: 0 }}>
            {data.scenarios.map((s, i) => (
              <View key={s.id}>
                {i > 0 && <Divider />}
                <ListRow
                  icon="bookmark-outline"
                  title={s.name}
                  subtitle={`${TEMPLATE_LABELS[s.inputs.template]} · ${s.horizonDays} days · saved ${formatDate(s.createdAt.slice(0, 10))}`}
                  onPress={() => router.push({ pathname: '/simulator', params: { scenarioId: s.id } })}
                />
              </View>
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}
