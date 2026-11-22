import { describe, expect, it } from 'vitest';
import { addDays, addMonths, diffDays, isLocalDate, startOfWeek, todayIn } from '../dates';
import { formatMoney, moneyAccessibilityLabel, mulDiv, parseMoneyInput } from '../money';

describe('parseMoneyInput', () => {
  it.each([
    ['1,250.50', 125050],
    ['1250.5', 125050],
    ['GH₵ 20', 2000],
    ['0.01', 1],
    ['.5', 50],
    ['1000000', 100000000],
  ])('parses %s', (raw, minor) => {
    expect(parseMoneyInput(raw)).toEqual({ ok: true, minor });
  });

  it.each(['', '-5', '1.234', 'abc', '0', '1,23', '12,34.00', '999999999999'])('rejects %s', (raw) => {
    expect(parseMoneyInput(raw).ok).toBe(false);
  });

  it('never loses pesewas to floating point', () => {
    for (let pesewas = 0; pesewas < 100; pesewas++) {
      const raw = `0.${String(pesewas).padStart(2, '0')}`;
      const r = parseMoneyInput(`123${raw.slice(1)}`);
      expect(r).toEqual({ ok: true, minor: 12300 + pesewas });
    }
  });
});

describe('formatMoney', () => {
  it('formats GHS with separators and two decimals', () => {
    expect(formatMoney(125050)).toBe('GH₵ 1,250.50');
    expect(formatMoney(0)).toBe('GH₵ 0.00');
    expect(formatMoney(-2005)).toBe('−GH₵ 20.05');
    expect(formatMoney(5, { showSign: true })).toBe('+GH₵ 0.05');
  });
  it('formats USD without a space after the symbol', () => {
    expect(formatMoney(125050, { currency: 'USD' })).toBe('$1,250.50');
    expect(formatMoney(-2005, { currency: 'USD', showSign: true })).toBe('−$20.05');
    expect(parseMoneyInput('$1,250.50')).toEqual({ ok: true, minor: 125050 });
  });
  it('rejects non-integer input', () => {
    expect(() => formatMoney(1.5)).toThrow();
  });
  it('round-trips with the parser', () => {
    for (const minor of [1, 99, 100, 123456, 987654321]) {
      const parsed = parseMoneyInput(formatMoney(minor));
      expect(parsed).toEqual({ ok: true, minor });
    }
  });
  it('has a spoken label', () => {
    expect(moneyAccessibilityLabel(125050)).toBe('1,250 cedis and 50 pesewas');
  });
});

describe('mulDiv', () => {
  it('rounds half up deterministically', () => {
    expect(mulDiv(1000, 1, 7)).toBe(143);
    expect(mulDiv(700, 3, 7)).toBe(300);
    expect(mulDiv(5, 1, 2)).toBe(3);
    expect(mulDiv(-5, 1, 2)).toBe(-3);
  });
});

describe('dates', () => {
  it('validates real calendar dates', () => {
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-13-01')).toBe(false);
  });
  it('does day arithmetic across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-03-01', '2026-02-01')).toBe(28);
  });
  it('clamps month addition to month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });
  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-10-30')).toBe('2026-10-26');
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
  });
  it('reads today in Africa/Accra (UTC+0, no daylight saving)', () => {
    expect(todayIn('Africa/Accra', new Date('2026-10-30T23:59:59Z'))).toBe('2026-10-30');
    expect(todayIn('Africa/Accra', new Date('2026-10-31T00:00:01Z'))).toBe('2026-10-31');
  });
});
