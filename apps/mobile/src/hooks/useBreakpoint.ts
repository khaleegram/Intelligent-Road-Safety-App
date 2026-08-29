import { useWindowDimensions } from 'react-native';

import { useTheme } from '../theme';

export type BreakpointName = 'mobile' | 'tablet' | 'desktop' | 'wide';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { breakpoints, containerPadding, gridColumns, maxContentWidth } = theme.tokens.layout;

  let name: BreakpointName = 'mobile';
  if (width >= breakpoints.wide) name = 'wide';
  else if (width >= breakpoints.desktop) name = 'desktop';
  else if (width >= breakpoints.tablet) name = 'tablet';

  const isTabletUp = width >= breakpoints.tablet;
  const contentPadding = isTabletUp ? containerPadding.tablet : containerPadding.mobile;
  const columns =
    name === 'desktop' || name === 'wide'
      ? gridColumns.desktop
      : name === 'tablet'
        ? gridColumns.tablet
        : gridColumns.mobile;

  return {
    width,
    name,
    isTabletUp,
    contentPadding,
    columns,
    maxContentWidth,
  };
}
