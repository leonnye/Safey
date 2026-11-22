import { useWindowDimensions } from 'react-native';

/** Layout sizes shared by screens. Phone stays a single column; wider windows use two. */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const compact = width < 420;
  const wide = width >= 960;
  const gutter = compact ? 12 : 20;
  const contentMax = wide ? Math.min(1120, width) : width;
  return { width, height, compact, wide, gutter, contentMax };
}
