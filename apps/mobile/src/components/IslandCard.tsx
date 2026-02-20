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
      ? theme.tokens.color.primary
      : variant === 'accent'
        ? theme.tokens.color.surfaceElevated
        : variant === 'success'
          ? theme.tokens.color.surfaceElevated
          : variant === 'warning'
            ? theme.tokens.color.surfaceElevated
            : theme.tokens.color.surface;

  const borderColor =
    variant === 'hero'
      ? theme.tokens.color.primaryHover
      : variant === 'accent'
        ? theme.tokens.color.primary
        : variant === 'success'
          ? theme.tokens.color.success
          : variant === 'warning'
            ? theme.tokens.color.warning
            : theme.tokens.color.border;

  const shadowLevel = variant === 'hero' ? theme.tokens.elevation.md : theme.tokens.elevation.sm;

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
      borderWidth: 1,
      borderRadius: theme.tokens.radius.lg,
      overflow: 'hidden',
    },
    content: {
      padding: theme.tokens.spacing[3],
    },
  });
