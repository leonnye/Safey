import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Money, TransactionRow } from '@/components/finance';
import { AppText, Button, Card, Chip, Divider, EmptyState, Field, IconButton, Screen, Segmented } from '@/components/ui';
import { formatDate } from '@/domain/dates';
import { useStore } from '@/store/StoreProvider';
import { useCategoryName, useSourceLabel } from '@/store/useFinance';
import { space } from '@/theme/tokens';

type DirectionFilter = 'all' | 'income' | 'expense';
const PAGE = 100;

export default function Activity() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const { data } = useStore();
  const categoryName = useCategoryName();
  const sourceLabel = useSourceLabel();
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [limit, setLimit] = useState(PAGE);
  const [lastParam, setLastParam] = useState(params.categoryId);
  if (params.categoryId !== lastParam) {
    setLastParam(params.categoryId);
    if (params.categoryId) setCategoryId(params.categoryId);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.transactions
      .filter((t) => direction === 'all' || t.direction === direction)
      .filter((t) => !sourceId || t.sourceId === sourceId)
      .filter((t) => !categoryId || t.categoryId === categoryId)
      .filter((t) => !q || t.note.toLowerCase().includes(q) || categoryName(t.categoryId).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [data.transactions, query, direction, sourceId, categoryId, categoryName]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, t) => {
          if (t.direction === 'income') acc.in += t.amountMinor;
          else acc.out += t.amountMinor;
          return acc;
        },
        { in: 0, out: 0 },
      ),
    [filtered],
  );

  const groups = useMemo(() => {
    const out: { date: string; items: typeof filtered }[] = [];
    for (const t of filtered.slice(0, limit)) {
      const last = out[out.length - 1];
      if (last && last.date === t.date) last.items.push(t);
      else out.push({ date: t.date, items: [t] });
    }
    return out;
  }, [filtered, limit]);

  const hasFilters = direction !== 'all' || sourceId || categoryId || query;

  return (
    <Screen
      title="Activity"
      right={<IconButton icon="add-circle-outline" label="Add a record" onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: 'new' } })} />}
    >
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        <Button label="Import CSV" icon="document-text-outline" variant="secondary" style={{ flexGrow: 1, flexBasis: 140 }} onPress={() => router.push('/import')} />
        <Button label="Sources" icon="wallet-outline" variant="secondary" style={{ flexGrow: 1, flexBasis: 120 }} onPress={() => router.push('/sources')} />
        <Button label="Categories" icon="pricetags-outline" variant="secondary" style={{ flexGrow: 1, flexBasis: 120 }} onPress={() => router.push('/categories')} />
      </View>

      <Field label="Search notes and categories" value={query} onChangeText={setQuery} placeholder="e.g. trotro, market" returnKeyType="search" />
      <Segmented
        label="Show"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'all', label: 'All' },
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expenses' },
        ]}
      />
      {data.sources.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
          <Chip label="All sources" selected={!sourceId} onPress={() => setSourceId(null)} />
          {data.sources.map((s) => (
            <Chip key={s.id} label={s.label} selected={sourceId === s.id} onPress={() => setSourceId(sourceId === s.id ? null : s.id)} />
          ))}
        </ScrollView>
      )}
      {categoryId && (
        <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
          <Chip label={`Category: ${categoryName(categoryId)} ✕`} selected onPress={() => setCategoryId(null)} />
        </View>
      )}

      {data.transactions.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No records yet"
          body="Add income or expenses as they happen, or import a CSV statement you can review before saving."
          action={{ label: 'Add a record', onPress: () => router.push({ pathname: '/transaction/[id]', params: { id: 'new' } }) }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search-outline" title="Nothing matches" body="Try a different search or clear the filters." />
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <AppText variant="caption" tone="secondary">
                  {filtered.length} record{filtered.length === 1 ? '' : 's'}
                  {hasFilters ? ' (filtered)' : ''} · in
                </AppText>
                <Money minor={totals.in} tone="success" />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="caption" tone="secondary">
                  out
                </AppText>
                <Money minor={totals.out} tone="expense" />
              </View>
            </View>
          </Card>
          {groups.map((g) => (
            <View key={g.date} style={{ gap: space[1] }}>
              <AppText variant="caption" tone="secondary" accessibilityRole="header">
                {formatDate(g.date)}
              </AppText>
              <Card style={{ paddingVertical: space[2], gap: 0 }}>
                {g.items.map((t, i) => (
                  <View key={t.id}>
                    {i > 0 && <Divider />}
                    <TransactionRow t={t} categoryName={categoryName(t.categoryId)} sourceLabel={sourceLabel(t.sourceId)} />
                  </View>
                ))}
              </Card>
            </View>
          ))}
          {filtered.length > limit && <Button label={`Show more (${filtered.length - limit} left)`} variant="secondary" onPress={() => setLimit((l) => l + PAGE)} />}
        </>
      )}
    </Screen>
  );
}
