import {
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  CircleDashed,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  type LucideIcon,
  PiggyBank,
  Plane,
  Receipt,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Category, SourceKind } from '@/domain/types';
import type { GoalIcon } from '@/store/state';

export interface Visual {
  icon: LucideIcon;
  /** Accent color for the icon tile. */
  hue: string;
}

const CATEGORY_VISUALS: Record<string, Visual> = {
  'sys-food-market': { icon: ShoppingBasket, hue: '#F29A5B' },
  'sys-transport': { icon: Car, hue: '#4FC3A1' },
  'sys-utilities': { icon: Zap, hue: '#6F8CFF' },
  'sys-rent-housing': { icon: House, hue: '#B9A3FF' },
  'sys-health': { icon: HeartPulse, hue: '#FF7A9A' },
  'sys-education': { icon: GraduationCap, hue: '#F4C46B' },
  'sys-family-support': { icon: Users, hue: '#E58FD8' },
  'sys-airtime-data': { icon: Smartphone, hue: '#FFCC33' },
  'sys-fees': { icon: Receipt, hue: '#9AA3B8' },
  'sys-savings': { icon: PiggyBank, hue: '#73D6AE' },
  'sys-expense-uncategorised': { icon: CircleDashed, hue: '#8E879F' },
  'sys-income-work': { icon: Briefcase, hue: '#73D6AE' },
  'sys-income-business': { icon: Store, hue: '#73D6AE' },
  'sys-income-side': { icon: Sparkles, hue: '#73D6AE' },
  'sys-income-support': { icon: HandHeart, hue: '#73D6AE' },
  'sys-income-uncategorised': { icon: Wallet, hue: '#73D6AE' },
};

const CUSTOM_HUES = ['#B9A3FF', '#91B9FF', '#F29A5B', '#4FC3A1', '#E58FD8', '#F4C46B'];

export function categoryVisual(cat: Category | undefined): Visual {
  if (!cat) return CATEGORY_VISUALS['sys-expense-uncategorised']!;
  const known = CATEGORY_VISUALS[cat.id];
  if (known) return known;
  const hue = cat.direction === 'income' ? '#73D6AE' : CUSTOM_HUES[cat.name.length % CUSTOM_HUES.length]!;
  return { icon: cat.direction === 'income' ? Wallet : BookOpen, hue };
}

export const SOURCE_KINDS: { value: SourceKind; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money_manual', label: 'Mobile Money' },
  { value: 'bank_manual', label: 'Bank account' },
  { value: 'other', label: 'Savings / other' },
];

const SOURCE_VISUALS: Record<SourceKind, Visual> = {
  cash: { icon: Banknote, hue: '#B9A3FF' },
  mobile_money_manual: { icon: Smartphone, hue: '#FFCC33' },
  bank_manual: { icon: Landmark, hue: '#B04BD8' },
  other: { icon: PiggyBank, hue: '#3DBE9A' },
};

export function sourceVisual(kind: SourceKind): Visual {
  return SOURCE_VISUALS[kind];
}

export function sourceKindLabel(kind: SourceKind): string {
  return SOURCE_KINDS.find((k) => k.value === kind)?.label ?? 'Other';
}

export const GOAL_ICONS: { value: GoalIcon; icon: LucideIcon; hue: string; label: string }[] = [
  { value: 'plane', icon: Plane, hue: '#8C9CFF', label: 'Travel' },
  { value: 'shield', icon: ShieldCheck, hue: '#3DBE9A', label: 'Emergency' },
  { value: 'home', icon: House, hue: '#B9A3FF', label: 'Home' },
  { value: 'laptop', icon: Laptop, hue: '#91B9FF', label: 'Gadget' },
  { value: 'graduation', icon: GraduationCap, hue: '#F4C46B', label: 'Education' },
  { value: 'heart', icon: HeartPulse, hue: '#FF7A9A', label: 'Health' },
  { value: 'car', icon: Car, hue: '#4FC3A1', label: 'Vehicle' },
  { value: 'gift', icon: Gift, hue: '#E58FD8', label: 'Gift' },
];

export function goalVisual(icon: GoalIcon) {
  return GOAL_ICONS.find((g) => g.value === icon) ?? GOAL_ICONS[0]!;
}
