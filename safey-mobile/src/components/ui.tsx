import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { type ComponentProps, type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Severity } from '@/domain/engine/warnings';
import { useStore } from '@/store/StoreProvider';
import { useResponsive } from '@/theme/responsive';
import { color, radius, space, tap, type as typeScale, type TypeVariant } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function AppText({
  variant = 'body',
  tone = 'primary',
  style,
  ...rest
}: TextProps & { variant?: TypeVariant;   tone?: 'primary' | 'secondary' | 'muted' | 'brand' | 'danger' | 'success' | 'warning' | 'expense' | 'onBrand' }) {
  const toneColor = {
    primary: color.textPrimary,
    secondary: color.textSecondary,
    muted: color.textMuted,
    brand: color.brandLavender,
    danger: color.danger,
    success: color.success,
    warning: color.warning,
    expense: color.expense,
    onBrand: color.onBrand,
  }[tone];
  return <Text {...rest} style={[typeScale[variant], { color: toneColor }, style]} maxFontSizeMultiplier={2} />;
}

export function Screen({
  title,
  back,
  children,
  right,
  scroll = true,
  footer,
}: {
  title?: string;
  back?: boolean;
  children: ReactNode;
  right?: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const { data, saveError } = useStore();
  const layout = useResponsive();
  const frame = { width: '100%' as const, maxWidth: layout.contentMax, alignSelf: 'center' as const };
  const body = (
    <>
      {data.profile?.mode === 'demo' && (
        <Banner tone="info" icon="flask-outline" text="Demo mode — all records here are synthetic samples, not real money." />
      )}
      {saveError && <Banner tone="danger" icon="alert-circle-outline" text={saveError} />}
      {children}
    </>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={[{ flex: 1 }, frame]}>
      {(title || back) && (
        <View style={[styles.header, { paddingHorizontal: layout.gutter }]}>
          {back ? (
            <IconButton icon="chevron-back" label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          ) : null}
          <AppText variant={back ? 'heading2' : 'heading1'} style={{ flex: 1 }} accessibilityRole="header">
            {title}
          </AppText>
          {right}
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: layout.gutter }]} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1, paddingHorizontal: layout.gutter }]}>{body}</View>
        )}
        {footer ? <View style={[styles.footer, { paddingHorizontal: layout.gutter }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

export function Card({ children, style, raised }: { children: ReactNode; style?: ViewStyle; raised?: boolean }) {
  return <View style={[styles.card, raised && { backgroundColor: color.surfaceRaised }, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
}) {
  const fg = variant === 'primary' ? color.onBrand : variant === 'danger' ? color.danger : color.brandLavender;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: pressed ? color.brandLavenderDeep : color.brandLavender },
        variant === 'secondary' && { borderWidth: 1, borderColor: color.borderSubtle, backgroundColor: pressed ? color.surfaceRaised : 'transparent' },
        variant === 'danger' && { borderWidth: 1, borderColor: color.danger, backgroundColor: pressed ? color.surfaceRaised : 'transparent' },
        variant === 'text' && { backgroundColor: pressed ? color.surfaceRaised : 'transparent', paddingHorizontal: space[3] },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
      <Text style={[typeScale.bodyEmphasis, { color: fg }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: color.surfaceRaised }]}>
      <Ionicons name={icon} size={22} color={color.textPrimary} />
    </Pressable>
  );
}

export function Field({
  label,
  helper,
  error,
  prefix,
  ...input
}: TextInputProps & { label: string; helper?: string; error?: string | null; prefix?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space[2] }}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <View style={[styles.input, focused && { borderColor: color.brandLavender }, error ? { borderColor: color.danger } : null]}>
        {prefix ? (
          <AppText variant="bodyEmphasis" tone="secondary">
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          {...input}
          accessibilityLabel={label}
          accessibilityHint={helper}
          placeholderTextColor={color.textMuted}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[typeScale.body, { color: color.textPrimary, flex: 1, paddingVertical: space[3] }, input.style]}
          maxFontSizeMultiplier={2}
        />
      </View>
      {error ? (
        <AppText variant="bodySmall" tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="bodySmall" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segmented}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: color.brandLavender }]}
          >
            <Text style={[typeScale.bodyEmphasis, { color: selected ? color.onBrand : color.textSecondary, textAlign: 'center' }]} maxFontSizeMultiplier={1.6}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: color.brandViolet, borderColor: color.brandLavender }]}
    >
      <AppText variant="bodySmall" tone={selected ? 'primary' : 'secondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const SEVERITY: Record<Severity, { label: string; icon: IconName; color: string }> = {
  urgent: { label: 'Urgent', icon: 'alert-circle', color: color.danger },
  attention: { label: 'Attention', icon: 'warning', color: color.warning },
  info: { label: 'For your information', icon: 'information-circle', color: color.info },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY[severity];
  return (
    <View style={[styles.badge, { borderColor: s.color }]} accessibilityLabel={`Severity: ${s.label}`}>
      <Ionicons name={s.icon} size={14} color={s.color} />
      <Text style={[typeScale.caption, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export function severityColor(severity: Severity) {
  return SEVERITY[severity].color;
}

export function Tag({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'brand' | 'success' | 'warning' | 'danger' }) {
  const c = { muted: color.textMuted, brand: color.brandLavender, success: color.success, warning: color.warning, danger: color.danger }[tone];
  return (
    <View style={[styles.badge, { borderColor: color.borderSubtle }]}>
      <Text style={[typeScale.caption, { color: c }]}>{label}</Text>
    </View>
  );
}

export function Banner({ text, tone, icon }: { text: string; tone: 'info' | 'danger' | 'warning'; icon: IconName }) {
  const c = tone === 'info' ? color.info : tone === 'danger' ? color.danger : color.warning;
  return (
    <View style={[styles.banner, { borderColor: c }]} accessibilityRole="alert">
      <Ionicons name={icon} size={18} color={c} />
      <AppText variant="bodySmall" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading3" accessibilityRole="header">
        {title}
      </AppText>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10} style={{ minHeight: tap.minimum, justifyContent: 'center' }}>
          <AppText variant="bodySmall" tone="brand">
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: { label: string; onPress: () => void } }) {
  return (
    <Card style={{ alignItems: 'center', gap: space[3], paddingVertical: space[7] }}>
      <Ionicons name={icon} size={32} color={color.brandLavender} />
      <AppText variant="heading3" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="bodySmall" tone="secondary" style={{ textAlign: 'center' }}>
        {body}
      </AppText>
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </Card>
  );
}

export function ListRow({
  title,
  subtitle,
  right,
  icon,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const content = (
    <>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={20} color={color.brandLavender} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyEmphasis" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={color.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surfaceRaised }]}>
      {content}
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.borderSubtle }} />;
}

export interface PickerOption {
  value: string;
  label: string;
  description?: string;
}

export function Picker({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose',
  error,
}: {
  label: string;
  value: string | null;
  options: PickerOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: space[2] }}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a list of choices"
        onPress={() => setOpen(true)}
        style={[styles.input, { justifyContent: 'space-between', minHeight: tap.minimum + 4 }, error ? { borderColor: color.danger } : null]}
      >
        <AppText tone={selected ? 'primary' : 'muted'} style={{ flex: 1 }}>
          {selected?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={color.textMuted} />
      </Pressable>
      {error ? (
        <AppText variant="bodySmall" tone="danger">
          {error}
        </AppText>
      ) : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close list" />
        <View style={styles.sheet}>
          <View style={styles.sectionHeader}>
            <AppText variant="heading3">{label}</AppText>
            <IconButton icon="close" label="Close" onPress={() => setOpen(false)} />
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            {options.map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: o.value === value }}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surfaceRaised }]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyEmphasis">{o.label}</AppText>
                  {o.description ? (
                    <AppText variant="bodySmall" tone="secondary">
                      {o.description}
                    </AppText>
                  ) : null}
                </View>
                {o.value === value ? <Ionicons name="checkmark" size={20} color={color.brandLavender} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export function Toggle({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} onPress={() => onChange(!value)} style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyEmphasis">{label}</AppText>
        {description ? (
          <AppText variant="bodySmall" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.switchTrack, value && { backgroundColor: color.brandLavender }]}>
        <View style={[styles.switchThumb, value && { alignSelf: 'flex-end', backgroundColor: color.onBrand }]} />
      </View>
      <AppText variant="caption" tone="secondary" style={{ width: 28 }}>
        {value ? 'On' : 'Off'}
      </AppText>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[3] },
  content: { paddingHorizontal: space[4], paddingBottom: space[8], gap: space[4] },
  footer: { paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderSubtle, backgroundColor: color.canvas, gap: space[2] },
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.borderSubtle, padding: space[4], gap: space[3] },
  button: { minHeight: tap.minimum + 4, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], paddingHorizontal: space[5] },
  iconButton: { width: tap.minimum, height: tap.minimum, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  input: { flexDirection: 'row', alignItems: 'center', gap: space[2], borderWidth: 1, borderColor: color.borderSubtle, backgroundColor: color.surface, borderRadius: radius.control, paddingHorizontal: space[4], minHeight: tap.minimum + 4 },
  segmented: { flexDirection: 'row', backgroundColor: color.surface, borderRadius: radius.control, borderWidth: 1, borderColor: color.borderSubtle, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: tap.minimum - 4, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2] },
  chip: { minHeight: 40, paddingHorizontal: space[3], borderRadius: radius.pill, borderWidth: 1, borderColor: color.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 2 },
  banner: { flexDirection: 'row', gap: space[2], alignItems: 'center', borderWidth: 1, borderRadius: radius.control, padding: space[3], backgroundColor: color.surface },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: tap.minimum + 8, paddingVertical: space[2], paddingHorizontal: space[1], borderRadius: radius.small },
  rowIcon: { width: 40, height: 40, borderRadius: radius.small, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: color.overlayScrim },
  sheet: { backgroundColor: color.surfaceRaised, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: space[4], paddingBottom: space[8], gap: space[2] },
  switchTrack: { width: 48, height: 28, borderRadius: radius.pill, backgroundColor: color.borderSubtle, padding: 3, justifyContent: 'center' },
  switchThumb: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: color.textSecondary },
});
