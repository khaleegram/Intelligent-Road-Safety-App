import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { type Theme, useTheme } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const sizeMap = {
  sm: { minHeight: 44, paddingHorizontal: 16, fontSize: 13, gap: 6 },
  md: { minHeight: 48, paddingHorizontal: 20, fontSize: 15, gap: 8 },
  lg: { minHeight: 56, paddingHorizontal: 24, fontSize: 16, gap: 8 },
} as const;

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const sizeStyle = sizeMap[size];
  const isDisabled = disabled || loading;
  const visual = getVisual(theme, variant, isDisabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: sizeStyle.minHeight,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          gap: sizeStyle.gap,
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
        },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={visual.textColor} />
      ) : icon ? (
        <View style={styles.icon}>{icon}</View>
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: visual.textColor,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const getVisual = (theme: Theme, variant: ButtonVariant, disabled: boolean) => {
  if (disabled) {
    return {
      backgroundColor: theme.color.surfaceElevated,
      borderColor: theme.color.border,
      textColor: theme.color.textSecondary,
    };
  }

  if (variant === 'secondary') {
    return {
      backgroundColor: 'transparent',
      borderColor: theme.color.border,
      textColor: theme.color.textPrimary,
    };
  }

  if (variant === 'ghost') {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.color.primary,
    };
  }

  if (variant === 'destructive') {
    return {
      backgroundColor: theme.color.error,
      borderColor: theme.color.error,
      textColor: theme.color.textInverse,
    };
  }

  return {
    backgroundColor: theme.color.primary,
    borderColor: theme.color.primary,
    textColor: theme.color.textInverse,
  };
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidth: {
      width: '100%',
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontWeight: theme.type.label.fontWeight,
      letterSpacing: 0.1,
    },
    pressed: {
      opacity: 0.9,
    },
    disabled: {
      opacity: 0.6,
    },
  });
