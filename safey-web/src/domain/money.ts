import type { CurrencyCode, Minor } from './types';

export const CURRENCY_CODE = 'GHS';
export const CURRENCY_SYMBOL = 'GH₵';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  major: string;
  minorName: string;
  /** USD is written `$1,250.00`; GHS keeps a space after the symbol. */
  spaced: boolean;
}

const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghana cedi', major: 'cedis', minorName: 'pesewas', spaced: true },
  USD: { code: 'USD', symbol: '$', name: 'US dollar', major: 'dollars', minorName: 'cents', spaced: false },
};

export function currencyInfo(code: CurrencyCode = 'GHS'): CurrencyInfo {
  return CURRENCIES[code] ?? CURRENCIES.GHS;
}

export const CURRENCY_OPTIONS: CurrencyCode[] = ['GHS', 'USD'];

/** GH₵ 100,000,000.00 — upper bound for a single entered amount. */
export const MAX_AMOUNT_MINOR = 10_000_000_000;

export type ParseMoneyResult = { ok: true; minor: Minor } | { ok: false; error: string };

/**
 * Parses a user-entered positive GHS amount into pesewas without floating point.
 * Accepts thousands separators and an optional currency prefix; rejects more than two decimals.
 */
export function parseMoneyInput(raw: string): ParseMoneyResult {
  const cleaned = raw
    .trim()
    .replace(/^(GH₵|GHS|GHC|₵|USD|US\$|\$)\s*/i, '')
    .replace(/\s/g, '');
  if (cleaned === '') return { ok: false, error: 'Enter an amount.' };
  if (cleaned.startsWith('-')) return { ok: false, error: 'Enter a positive amount. Choose income or expense separately.' };
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d*)?$/.test(cleaned) && !/^\.\d+$/.test(cleaned)) {
    return { ok: false, error: 'Use digits only, for example 1,250.50.' };
  }
  const [wholeRaw, fraction = ''] = cleaned.replace(/,/g, '').split('.');
  if (fraction.length > 2) return { ok: false, error: 'Use at most two decimal places.' };
  const whole = wholeRaw === '' ? '0' : wholeRaw;
  if (whole.length > 12) return { ok: false, error: 'That amount is too large.' };
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (minor <= 0) return { ok: false, error: 'Enter an amount above zero.' };
  if (minor > MAX_AMOUNT_MINOR) return { ok: false, error: 'That amount is too large.' };
  return { ok: true, minor };
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Formats minor units as `GH₵ 1,250.00` or `$1,250.00`. Negative values use a leading minus sign. */
export function formatMoney(minor: Minor, options: { showSign?: boolean; currency?: CurrencyCode } = {}): string {
  if (!Number.isInteger(minor)) throw new Error('formatMoney expects integer minor units');
  const info = currencyInfo(options.currency ?? 'GHS');
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  const amount = `${groupThousands(String(whole))}.${fraction}`;
  const body = info.spaced ? `${info.symbol} ${amount}` : `${info.symbol}${amount}`;
  if (negative) return `−${body}`;
  if (options.showSign && minor > 0) return `+${body}`;
  return body;
}

/** Converts pesewas to the plain decimal string used in text fields, e.g. `1250.50`. */
export function minorToInput(minor: Minor): string {
  const whole = Math.floor(Math.abs(minor) / 100);
  const fraction = String(Math.abs(minor) % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

/** Spoken form for screen readers, e.g. "1,250 cedis and 50 pesewas". */
export function moneyAccessibilityLabel(minor: Minor, currency: CurrencyCode = 'GHS'): string {
  const info = currencyInfo(currency);
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const major = Math.floor(abs / 100);
  const minorUnits = abs % 100;
  const parts = `${groupThousands(String(major))} ${info.major}${minorUnits ? ` and ${minorUnits} ${info.minorName}` : ''}`;
  return negative ? `minus ${parts}` : parts;
}

/** Integer multiply-then-divide with round-half-up, used for rates. */
export function mulDiv(value: Minor, numerator: number, denominator: number): Minor {
  if (denominator === 0) throw new Error('mulDiv denominator is zero');
  const product = value * numerator;
  const q = Math.trunc(product / denominator);
  const r = product - q * denominator;
  if (Math.abs(r) * 2 >= Math.abs(denominator)) return q + (product >= 0 ? 1 : -1);
  return q;
}
