import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { InsightCard, Logo, Money, StatCard } from '@/components/finance';
import { ProjectionChart } from '@/components/ProjectionChart';
import { AppText, Button, Card, EmptyState, ListRow, Screen, SectionHeader, Tag } from '@/components/ui';
import { addDays, formatDate, formatShortDate, startOfMonth } from '@/domain/dates';
import { PROVISIONAL } from '@/domain/engine/config';
import { billCategoryIds, estimateSpendingRate, expandPlannedItems, projectCashFlow } from '@/domain/engine/projection';
import { periodSummary } from '@/domain/engine/summary';
import { useStore } from '@/store/StoreProvider';
import { useCategoryName, useFinance } from '@/store/useFinance';
import { useResponsive } from '@/theme/responsive';
import { color, space } from '@/theme/tokens';

const COVERAGE_LABEL = { none: 'No records yet', sparse: 'Few records', partial: 'Some records', good: 'Regular records' } as const;

export default function Home() {
  const { data, today } = useStore();
  const { wide, compact } = useResponsive();
  const { position, coverage, visible, warnings } = useFinance();
  const categoryName = useCategoryName();
  const horizon = PROVISIONAL.projection.defaultHorizonDays;

  const { month, upcoming, projection } = useMemo(() => {
    const month = periodSummary(data.transactions, startOfMonth(today), today);
    const upcoming = expandPlannedItems(data.plannedItems, today, addDays(today, horizon));
    const spending = estimateSpendingRate(data.transactions, today, billCategoryIds(data.plannedItems));
    const projection =
      data.sources.some((s) => !s.isArchived) && coverage.level !== 'none'
        ? projectCashFlow({ today, horizonDays: horizon, startBalanceMinor: position.totalMinor, occurrences: expandPlannedItems(data.plannedItems, addDays(today, 1), addDays(today, horizon)), spending })
        : null;
    return { month, upcoming, projection };
  }, [data, today, coverage.level, position.totalMinor, horizon]);

  const hasSources = data.sources.some((s) => !s.isArchived);
  const name = data.profile?.displayName;
  const bills = upcoming.filter((o) => o.direction === 'expense');
  const income = upcoming.filter((o) => o.direction === 'income');
  const top = visible[0];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[3] }}>
        <Logo size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="secondary">
            {formatDate(today)}
          </AppText>
          <AppText variant="heading2">{name ? `Hello, ${name}` : 'Where you stand'}</AppText>
        </View>
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: space[4], alignItems: 'stretch', width: '100%' }}>
      <View style={{ flexGrow: 1, flexBasis: wide ? 0 : undefined, gap: space[4], minWidth: 0, width: wide ? undefined : '100%' }}>
      {!hasSources ? (
        <EmptyState
          icon="wallet-outline"
          title="Add where your money is"
          body="Start with cash or a Mobile Money wallet you track yourself. Safey uses it to show your recorded balance."
          action={{ label: 'Add a money source', onPress: () => router.push({ pathname: '/source/[id]', params: { id: 'new' } }) }}
        />
      ) : (
        <Card raised style={{ borderColor: color.brandViolet, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', top: -48, right: -24, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(185, 163, 255, 0.14)' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2] }}>
            <AppText variant="caption" tone="secondary">
              Recorded balance
            </AppText>
            <Tag label={COVERAGE_LABEL[coverage.level]} tone={coverage.level === 'good' ? 'success' : coverage.level === 'none' ? 'muted' : 'warning'} />
          </View>
          <Money minor={position.totalMinor} variant="moneyLarge" tone={position.totalMinor < 0 ? 'expense' : 'primary'} />
          <AppText variant="bodySmall" tone="secondary">
            Based on records you entered, as of {formatDate(today)} · {position.sources.length} source{position.sources.length === 1 ? '' : 's'}. Not a live account balance.
          </AppText>
          <AppText variant="caption" tone="muted">
            {coverage.description}
          </AppText>
        </Card>
      )}

      <View style={{ flexDirection: compact ? 'column' : 'row', gap: space[3], flexWrap: 'wrap' }}>
        <Button label="Add income" icon="add" variant="secondary" style={{ flexGrow: 1, flexBasis: compact ? '100%' : 160 }} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: 'new', direction: 'income' } })} />
        <Button label="Add expense" icon="remove" style={{ flexGrow: 1, flexBasis: compact ? '100%' : 160, backgroundColor: color.expense }} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: 'new', direction: 'expense' } })} />
      </View>

      <Card>
        <SectionHeader title="This month" action={{ label: 'Activity', onPress: () => router.push('/activity') }} />
        {month.count === 0 ? (
          <AppText variant="bodySmall" tone="secondary">
            No records yet this month.
          </AppText>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[3] }}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" tone="secondary">
                  Money in
                </AppText>
                <Money minor={month.inflowMinor} tone="success" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="caption" tone="secondary">
                  Money out
                </AppText>
                <Money minor={month.outflowMinor} tone="expense" />
              </View>
            </View>
            {month.expenseByCategory.slice(0, 4).map((c) => (
              <ListRow key={c.categoryId} title={categoryName(c.categoryId)} subtitle={`${c.count} record${c.count === 1 ? '' : 's'}`} right={<Money minor={c.totalMinor} tone="expense" />} />
            ))}
          </>
        )}
      </Card>
      </View>

      <View style={{ flexGrow: 1, flexBasis: wide ? 0 : undefined, gap: space[4], minWidth: 0, width: wide ? undefined : '100%' }}>
      {top ? (
        <View style={{ gap: space[2] }}>
          <SectionHeader title="Safey noticed" action={visible.length > 1 ? { label: `See all ${visible.length}`, onPress: () => router.push('/insights') } : undefined} />
          <InsightCard insight={top} compact />
        </View>
      ) : hasSources && warnings.suppressed.length > 0 && coverage.level !== 'good' ? (
        <Card>
          <AppText variant="heading3">Keep adding records</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Early warnings switch on once Safey has enough to go on. {coverage.description}
          </AppText>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space[3], flexWrap: 'wrap' }}>
        <StatCard label="Expected income" icon="arrow-down-circle-outline" tone="success" minor={income.reduce((s, o) => s + o.amountMinor, 0)} caption={`Entered for next ${horizon} days`} />
        <StatCard label="Upcoming bills" icon="receipt-outline" tone="expense" minor={bills.reduce((s, o) => s + o.amountMinor, 0)} caption={`Entered for next ${horizon} days`} />
      </View>

      {projection ? (
        <Card>
          <SectionHeader title={`Next ${horizon} days (estimate)`} action={{ label: 'Try a scenario', onPress: () => router.push('/simulator') }} />
          <ProjectionChart baseline={projection} thresholdMinor={data.profile?.bufferMinor || undefined} height={140} />
        </Card>
      ) : null}

      {bills.length > 0 && (
        <Card>
          <SectionHeader title="Next bills" action={{ label: 'Plan', onPress: () => router.push('/plan') }} />
          {bills.slice(0, 3).map((b) => (
            <ListRow key={b.key} icon="receipt-outline" title={b.label} subtitle={formatShortDate(b.date)} right={<Money minor={b.amountMinor} tone="expense" />} />
          ))}
        </Card>
      )}

      </View>
      </View>
    </Screen>
  );
}
