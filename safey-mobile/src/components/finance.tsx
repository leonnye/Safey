import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { addDays, formatDate, formatShortDate, isLocalDate } from '@/domain/dates';
import type { Insight } from '@/domain/engine/warnings';
import { currencyInfo, formatMoney, minorToInput, moneyAccessibilityLabel, parseMoneyInput } from '@/domain/money';
import type { CurrencyCode, Transaction } from '@/domain/types';
import { useStore } from '@/store/StoreProvider';
import { useResponsive } from '@/theme/responsive';
import { color, space, type TypeVariant } from '@/theme/tokens';
import { AppText, Card, Chip, Field, type IconName, Segmented, SeverityBadge, severityColor, styles, Tag } from './ui';

export function useCurrency() {
  const { data } = useStore();
  const code = data.profile?.defaultCurrency ?? 'GHS';
  return {
    code,
    symbol: currencyInfo(code).symbol,
    format: (minor: number, options: { showSign?: boolean } = {}) => formatMoney(minor, { ...options, currency: code }),
    spoken: (minor: number) => moneyAccessibilityLabel(minor, code),
  };
}

export function Logo({ size = 40, wordmark }: { size?: number; wordmark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }} accessible accessibilityRole="image" accessibilityLabel="Safey">
      <Image source={require('../../assets/safey-mark.png')} style={{ width: size, height: size, borderRadius: size / 4 }} />
      {wordmark ? <AppText variant="heading2">Safey</AppText> : null}
    </View>
  );
}

export function Money({
  minor,
  variant = 'money',
  tone,
  showSign,
  currency,
}: {
  minor: number;
  variant?: TypeVariant;
  tone?: 'primary' | 'secondary' | 'success' | 'danger' | 'expense' | 'brand';
  showSign?: boolean;
  currency?: CurrencyCode;
}) {
  const active = useCurrency();
  const { compact, wide } = useResponsive();
  const code = currency ?? active.code;
  const resolved = tone ?? (minor < 0 ? 'expense' : 'primary');
  const scale =
    variant === 'moneyLarge' ? (compact ? { fontSize: 30, lineHeight: 36 } : wide ? { fontSize: 44, lineHeight: 50 } : null) : null;
  return (
    <AppText variant={variant} tone={resolved} accessibilityLabel={moneyAccessibilityLabel(minor, code)} style={[{ fontVariant: ['tabular-nums'], flexShrink: 1 }, scale]}>
      {formatMoney(minor, { showSign, currency: code })}
    </AppText>
  );
}

export function CurrencyChoice({ value, onChange }: { value: CurrencyCode; onChange: (code: CurrencyCode) => void }) {
  return (
    <Segmented
      label="Currency"
      value={value}
      onChange={onChange}
      options={[
        { value: 'GHS', label: 'GH₵  Cedi' },
        { value: 'USD', label: '$  US dollar' },
      ]}
    />
  );
}

/** Text field that keeps amounts as text until valid, then reports integer pesewas. */
export function useMoneyInput(initialMinor?: number, allowZero = false) {
  const [text, setText] = useState(initialMinor !== undefined && (initialMinor > 0 || allowZero) ? minorToInput(initialMinor) : '');
  const parsed = parseMoneyInput(text);
  const isZero = allowZero && /^0*(\.0*)?$/.test(text.trim().replace(/^(GH₵|GHS|GHC|₵|USD|US\$|\$)\s*/i, '')) && text.trim() !== '';
  return {
    text,
    setText,
    minor: parsed.ok ? parsed.minor : isZero ? 0 : null,
    error: text === '' ? null : parsed.ok || isZero ? null : parsed.error,
  };
}

export function MoneyField({
  label,
  helper,
  input,
  required,
  currency,
}: {
  label: string;
  helper?: string;
  input: ReturnType<typeof useMoneyInput>;
  required?: string | null;
  currency?: CurrencyCode;
}) {
  const active = useCurrency();
  return (
    <Field
      label={label}
      helper={helper}
      prefix={currencyInfo(currency ?? active.code).symbol}
      value={input.text}
      onChangeText={input.setText}
      keyboardType="decimal-pad"
      inputMode="decimal"
      placeholder="0.00"
      error={input.error ?? required}
    />
  );
}

export function DateField({ label, value, onChange, today, helper, allowFuture = true }: { label: string; value: string; onChange: (v: string) => void; today: string; helper?: string; allowFuture?: boolean }) {
  const valid = isLocalDate(value);
  const error = value && !valid ? 'Use the format YYYY-MM-DD, for example 2026-10-30.' : !allowFuture && valid && value > today ? 'Choose today or an earlier date.' : null;
  const quick = allowFuture
    ? [
        { label: 'Today', v: today },
        { label: 'In 7 days', v: addDays(today, 7) },
        { label: 'In 14 days', v: addDays(today, 14) },
      ]
    : [
        { label: 'Today', v: today },
        { label: 'Yesterday', v: addDays(today, -1) },
      ];
  return (
    <View style={{ gap: space[2] }}>
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        error={error}
        helper={valid ? `${formatDate(value)}${helper ? ` · ${helper}` : ''}` : helper}
      />
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        {quick.map((q) => (
          <Chip key={q.label} label={q.label} selected={value === q.v} onPress={() => onChange(q.v)} />
        ))}
      </View>
    </View>
  );
}

export function TransactionRow({ t, categoryName, sourceLabel }: { t: Transaction; categoryName: string; sourceLabel: string }) {
  const income = t.direction === 'income';
  const signed = income ? t.amountMinor : -t.amountMinor;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${income ? 'Income' : 'Expense'} ${moneyAccessibilityLabel(t.amountMinor, t.currency)}, ${categoryName}, ${formatDate(t.date)}, ${sourceLabel}${t.note ? `, ${t.note}` : ''}`}
      accessibilityHint="Opens this record to edit or delete"
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surfaceRaised }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={income ? 'arrow-down' : 'arrow-up'} size={18} color={income ? color.success : color.expense} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyEmphasis" numberOfLines={1}>
          {t.note || categoryName}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" numberOfLines={1}>
          {t.note ? `${categoryName} · ` : ''}
          {sourceLabel} · {formatShortDate(t.date)}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Money minor={signed} showSign tone={income ? 'success' : 'expense'} currency={t.currency} />
        {t.origin === 'csv' ? <Tag label="Imported" /> : null}
      </View>
    </Pressable>
  );
}

export function InsightCard({ insight, compact }: { insight: Insight; compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens details, evidence and options"
      onPress={() => router.push({ pathname: '/insight/[fingerprint]', params: { fingerprint: insight.fingerprint } })}
      style={({ pressed }) => [
        styles.card,
        { borderColor: severityColor(insight.severity), borderLeftWidth: 4 },
        pressed && { backgroundColor: color.surfaceRaised },
      ]}
    >
      <SeverityBadge severity={insight.severity} />
      <AppText variant="heading3">{insight.title}</AppText>
      <AppText variant="bodySmall" tone="secondary" numberOfLines={compact ? 3 : undefined}>
        {insight.observation}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
          {formatDate(insight.period.start)} – {formatDate(insight.period.end)}
        </AppText>
        <AppText variant="bodySmall" tone="brand">
          Why am I seeing this?
        </AppText>
      </View>
    </Pressable>
  );
}

export function StatCard({ label, minor, caption, icon, tone }: { label: string; minor: number; caption: string; icon: IconName; tone?: 'primary' | 'success' | 'expense' }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: '46%', minWidth: 140 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Ionicons name={icon} size={16} color={tone === 'expense' ? color.expense : tone === 'success' ? color.success : color.brandLavender} />
        <AppText variant="caption" tone="secondary">
          {label}
        </AppText>
      </View>
      <Money minor={minor} variant="heading3" tone={tone} />
      <AppText variant="caption" tone="muted">
        {caption}
      </AppText>
    </Card>
  );
}
