import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CurrencyChoice, Logo, MoneyField, useMoneyInput } from '@/components/finance';
import { AppText, Button, Card, Field, type IconName, Picker, Screen } from '@/components/ui';
import { SOURCE_KIND_OPTIONS } from '@/copy/sources';
import type { CurrencyCode, SourceKind } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';
import { color, radius, space } from '@/theme/tokens';

function Point({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space[3] }}>
      <Ionicons name={icon} size={22} color={color.brandLavender} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyEmphasis">{title}</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {body}
        </AppText>
      </View>
    </View>
  );
}

const STEPS = 5;

export default function Onboarding() {
  const { completeOnboarding, startDemo } = useStore();
  const [step, setStep] = useState(0);
  const [adult, setAdult] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('GHS');
  const [name, setName] = useState('');
  const buffer = useMoneyInput(undefined, true);
  const [sourceLabel, setSourceLabel] = useState('Cash');
  const [sourceKind, setSourceKind] = useState<SourceKind>('cash');
  const opening = useMoneyInput(undefined, true);
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS - 1));
  };

  const finish = (withSource: boolean) => {
    if (withSource && (opening.minor === null || !sourceLabel.trim())) {
      setError('Enter a name and a starting balance (0 is fine), or skip for now.');
      return;
    }
    completeOnboarding({
      displayName: name,
      bufferMinor: buffer.minor ?? 0,
      currency,
      aiConsent: false,
      source: withSource ? { label: sourceLabel.trim(), kind: sourceKind, openingBalanceMinor: opening.minor ?? 0 } : null,
    });
    router.replace('/(tabs)');
  };

  const progress = (
    <View style={{ flexDirection: 'row', gap: space[1] }} accessibilityLabel={`Step ${step} of ${STEPS - 1}`}>
      {Array.from({ length: STEPS - 1 }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: i < step ? color.brandLavender : color.borderSubtle }} />
      ))}
    </View>
  );

  if (step === 0) {
    return (
      <Screen
        footer={
          <>
            <Button label="Get started" onPress={next} />
            <Button
              label="Explore with sample data"
              variant="text"
              accessibilityHint="Opens a demo with synthetic records, kept separate from your own"
              onPress={() => {
                startDemo();
                router.replace('/(tabs)');
              }}
            />
          </>
        }
      >
        <View style={{ paddingTop: space[8], gap: space[6] }}>
          <Logo size={88} />
          <AppText variant="display" accessibilityRole="header">
            See where you stand, even when income isn’t regular.
          </AppText>
          <AppText tone="secondary">
            Safey helps you record money in and out, plan for what’s coming, and notice early when things may get tight. Built for Ghana, in GH₵.
          </AppText>
        </View>
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen title="What Safey can see" footer={<Button label="I understand" onPress={next} />}>
        {progress}
        <Card>
          <Point icon="create-outline" title="Only what you add" body="You enter records yourself or import a CSV file you review first. Safey does not connect to banks or Mobile Money, and never asks for a PIN or OTP." />
          <Point icon="analytics-outline" title="Estimates, not promises" body="Plans and warnings are calculated from your records. If records are missing, Safey tells you and holds back." />
          <Point icon="school-outline" title="Not financial advice" body="Safey is a planning companion. It does not give credit, loan, investment or tax advice, and it cannot move money." />
        </Card>
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen
        title="A few basics"
        footer={
          <Button
            label="Continue"
            disabled={!adult}
            onPress={() => (adult ? next() : setError('Safey is for adults aged 18 and over.'))}
            accessibilityHint={adult ? undefined : 'Confirm you are 18 or older first'}
          />
        }
      >
        {progress}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: adult }}
          onPress={() => setAdult((a) => !a)}
          style={{ flexDirection: 'row', gap: space[3], alignItems: 'center', minHeight: 56 }}
        >
          <Ionicons name={adult ? 'checkbox' : 'square-outline'} size={28} color={adult ? color.brandLavender : color.textSecondary} />
          <AppText variant="bodyEmphasis" style={{ flex: 1 }}>
            I am 18 or older
          </AppText>
        </Pressable>
        <Card>
          <AppText variant="heading3">Region settings</AppText>
          <CurrencyChoice value={currency} onChange={setCurrency} />
          <AppText variant="bodySmall" tone="secondary">
            {currency === 'GHS' ? 'Amounts are saved in Ghana cedis (GH₵).' : 'Amounts are saved in US dollars ($).'} You can switch later in Profile. Switching does not convert numbers.
          </AppText>
          <Point icon="time-outline" title="Time zone: Africa/Accra" body="Days start and end on Ghana time." />
          <Point icon="language-outline" title="Language: English (Ghana)" body="More languages may come after research with users." />
        </Card>
        {error ? <AppText tone="danger">{error}</AppText> : null}
      </Screen>
    );
  }

  if (step === 3) {
    return (
      <Screen title="Your data, your choice" footer={<Button label="Continue" onPress={next} disabled={buffer.error !== null} />}>
        {progress}
        <Card>
          <Point icon="phone-portrait-outline" title="Stored on this device" body="This version keeps your records only on this phone. There is no account and nothing is sent to a server." />
          <Point icon="download-outline" title="Export or delete any time" body="Profile → Your data lets you export everything or erase it." />
          <Point icon="sparkles-outline" title="AI is off" body="AI explanations are optional and need a secure server, which this version does not have. Nothing is sent to an AI service." />
        </Card>
        <Field label="What should Safey call you? (optional)" value={name} onChangeText={setName} placeholder="e.g. Ama" maxLength={40} autoCapitalize="words" />
        <MoneyField
          label="Money you'd like to keep aside (optional)"
          helper="Safey lets you know if estimates dip below this buffer. You can change it later."
          input={buffer}
          currency={currency}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Add where your money is"
      footer={
        <>
          <Button label="Save and start" onPress={() => finish(true)} />
          <Button label="Skip for now" variant="text" onPress={() => finish(false)} />
        </>
      }
    >
      {progress}
      <AppText tone="secondary">
        Start with one place you keep money, like cash or a Mobile Money wallet. This is a record you keep — not a connected account.
      </AppText>
      <Picker
        label="Type"
        value={sourceKind}
        options={SOURCE_KIND_OPTIONS}
        onChange={(v) => {
          const kind = v as SourceKind;
          setSourceKind(kind);
          setSourceLabel(SOURCE_KIND_OPTIONS.find((o) => o.value === kind)?.defaultLabel ?? '');
        }}
      />
      <Field label="Name" value={sourceLabel} onChangeText={setSourceLabel} maxLength={40} />
      <MoneyField label="How much is there today?" helper="Your best count is fine. You can edit this later." input={opening} currency={currency} />
      {error ? <AppText tone="danger">{error}</AppText> : null}
    </Screen>
  );
}
