import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { type Theme, useTheme } from '../theme';

type IconButtonProps = {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'ghost' | 'solid';
  disabled?: boolean;
  badge?: boolean;
};

export default function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'ghost',
  disabled = false,
  badge = false,
}: IconButtonProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const backgroundColor =
    variant === 'solid' ? theme.color.surfaceElevated : 'transparent';
  const borderColor = variant === 'solid' ? theme.color.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, borderColor },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.4,
    },
    badge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.error,
    },
  });
