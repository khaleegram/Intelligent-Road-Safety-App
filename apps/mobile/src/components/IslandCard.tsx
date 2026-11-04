import React from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { type Theme, useTheme } from '../theme';

type IslandVariant = 'card' | 'accent' | 'success' | 'warning' | 'hero';

type IslandCardProps = React.PropsWithChildren<{
  variant?: IslandVariant;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
}>;

export default function IslandCard({
  variant = 'card',
  style,
  contentStyle,
  onLayout,
  children,
}: IslandCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const backgroundColor =
    variant === 'hero'
      ? theme.color.surfaceElevated
      : variant === 'accent'
        ? theme.color.surfaceElevated
        : variant === 'success'
          ? theme.color.surfaceElevated
          : variant === 'warning'
            ? theme.color.surfaceElevated
            : theme.color.surface;

  const borderColor =
    variant === 'hero' || variant === 'accent'
      ? theme.color.primary
      : variant === 'success'
        ? theme.color.success
        : variant === 'warning'
          ? theme.color.warning
          : theme.color.border;

  const shadowLevel = variant === 'card' ? theme.elevation.flat : theme.elevation.raised;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          shadowColor: shadowLevel.shadowColor,
          shadowOpacity: shadowLevel.shadowOpacity,
          shadowRadius: shadowLevel.shadowRadius,
          shadowOffset: shadowLevel.shadowOffset,
          elevation: shadowLevel.elevation,
        },
        style,
      ]}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderWidth: 0,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    content: {
      padding: theme.space[4],
    },
  });
