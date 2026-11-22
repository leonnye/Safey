import type { TextStyle } from 'react-native';

/** Semantic tokens from DESIGN.md. Components use these aliases, never raw values. */
export const color = {
  canvas: '#09080F',
  surface: '#11101A',
  surfaceRaised: '#191725',
  surfaceGlass: 'rgba(32, 27, 48, 0.78)',
  borderSubtle: '#2A2638',
  textPrimary: '#F6F3FC',
  textSecondary: '#B8B2C8',
  textMuted: '#8E879F',
  brandLavender: '#B9A3FF',
  brandLavenderDeep: '#8E71E8',
  brandViolet: '#5E46A8',
  success: '#73D6AE',
  warning: '#F4C46B',
  danger: '#FF858D',
  /** Money spent. Clearer red than the status coral so outflows read at a glance. */
  expense: '#FF4B5C',
  info: '#91B9FF',
  overlayScrim: 'rgba(4, 3, 8, 0.68)',
  onBrand: '#09080F',
  chartRecorded: '#B9A3FF',
  chartScenario: '#8C9CFF',
  chartThreshold: '#F4C46B',
  chartUrgent: '#FF858D',
} as const;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

const money: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontFamily: font.bold, fontSize: 32, lineHeight: 38 },
  heading1: { fontFamily: font.bold, fontSize: 26, lineHeight: 32 },
  heading2: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26 },
  heading3: { fontFamily: font.semibold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  bodyEmphasis: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  moneyLarge: { fontFamily: font.bold, fontSize: 36, lineHeight: 42, ...money },
  money: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24, ...money },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40 } as const;

export const radius = { small: 10, control: 14, card: 20, sheet: 28, pill: 999 } as const;

export const tap = { minimum: 48 } as const;

export const motion = { state: 200, sheet: 300 } as const;
