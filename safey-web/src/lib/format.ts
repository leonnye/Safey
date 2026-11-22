import { diffDays, formatDate, formatShortDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import type { CurrencyCode, Minor } from '@/domain/types';

/** `GH₵ 320` for whole amounts and `GH₵ 320.50` otherwise. */
export function money(minor: Minor, currency: CurrencyCode, opts: { sign?: boolean; exact?: boolean } = {}): string {
  const text = formatMoney(minor, { currency, showSign: opts.sign });
  return !opts.exact && minor % 100 === 0 ? text.replace(/\.00$/, '') : text;
}

/** Signed transaction amount, e.g. `+ GH₵ 200` / `− GH₵ 45`. */
export function signedMoney(minor: Minor, direction: 'income' | 'expense', currency: CurrencyCode): string {
  return `${direction === 'income' ? '+' : '−'} ${money(minor, currency)}`;
}

export function relativeDay(date: string, today: string): string {
  const d = diffDays(date, today);
  if (d === 0) return 'Today';
  if (d === -1) return 'Yesterday';
  if (d === 1) return 'Tomorrow';
  return formatShortDate(date);
}

export function dueIn(date: string, today: string): string {
  const d = diffDays(date, today);
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} late`;
  if (d === 0) return 'Today';
  return `${d} day${d === 1 ? '' : 's'}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || 'S'
  );
}

export { formatDate, formatShortDate };
