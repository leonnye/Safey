import type { IconName } from '@/components/ui';
import type { SourceKind } from '@/domain/types';

export const SOURCE_KIND_OPTIONS: { value: SourceKind; label: string; description: string; defaultLabel: string }[] = [
  { value: 'cash', label: 'Cash', description: 'Money you hold in hand', defaultLabel: 'Cash' },
  { value: 'mobile_money_manual', label: 'Mobile Money (tracked by you)', description: 'You record the activity; nothing is connected', defaultLabel: 'Mobile Money' },
  { value: 'bank_manual', label: 'Bank account (tracked by you)', description: 'You record the activity; nothing is connected', defaultLabel: 'Bank account' },
  { value: 'other', label: 'Other', description: 'Susu, savings box, or anything else', defaultLabel: 'Other' },
];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  cash: 'Cash',
  mobile_money_manual: 'Mobile Money · manual',
  bank_manual: 'Bank · manual',
  other: 'Other · manual',
};

export const SOURCE_KIND_ICON: Record<SourceKind, IconName> = {
  cash: 'cash-outline',
  mobile_money_manual: 'phone-portrait-outline',
  bank_manual: 'business-outline',
  other: 'wallet-outline',
};
