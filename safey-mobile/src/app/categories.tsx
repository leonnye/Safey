import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Divider, Field, Screen, Segmented, Toggle } from '@/components/ui';
import type { Direction } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';
import { space } from '@/theme/tokens';

export default function Categories() {
  const { data, addCategory, setCategoryActive } = useStore();
  const [direction, setDirection] = useState<Direction>('expense');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const list = data.categories.filter((c) => c.direction === direction);

  return (
    <Screen title="Categories" back>
      <Segmented
        label="Category type"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'expense', label: 'Expenses' },
          { value: 'income', label: 'Income' },
        ]}
      />
      <Card>
        <Field label="New category" value={name} onChangeText={setName} placeholder="e.g. Church & giving" maxLength={40} error={error} />
        <Button
          label="Add category"
          variant="secondary"
          onPress={() => {
            setError(null);
            try {
              addCategory(name, direction);
              setName('');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not add.');
            }
          }}
        />
      </Card>
      <AppText variant="bodySmall" tone="secondary">
        Turn a category off to hide it when adding records. Records already in it are kept.
      </AppText>
      <Card style={{ gap: 0 }}>
        {list.map((c, i) => (
          <View key={c.id}>
            {i > 0 && <Divider />}
            <Toggle label={c.name} description={c.isSystem ? 'Starter category' : 'Added by you'} value={c.isActive} onChange={(v) => setCategoryActive(c.id, v)} />
          </View>
        ))}
      </Card>
      <View style={{ height: space[4] }} />
    </Screen>
  );
}
