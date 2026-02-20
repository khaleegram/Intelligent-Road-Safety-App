import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { type Theme, useTheme } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const sizeMap = {
  sm: { minHeight: 44, paddingHorizontal: 12, fontSize: 12 },
  md: { minHeight: 48, paddingHorizontal: 16, fontSize: 14 },
  lg: { minHeight: 52, paddingHorizontal: 20, fontSize: 16 },
} as const;

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const sizeStyle = sizeMap[size];

  const visual = getVisual(theme, variant, disabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: sizeStyle.minHeight,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
        },
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
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
      backgroundColor: theme.tokens.color.surfaceElevated,
      borderColor: theme.tokens.color.border,
      textColor: theme.tokens.color.textSecondary,
    };
  }

  if (variant === 'secondary') {
    return {
      backgroundColor: theme.tokens.color.surface,
      borderColor: theme.tokens.color.border,
      textColor: theme.tokens.color.textPrimary,
    };
  }

  if (variant === 'ghost') {
    return {
      backgroundColor: theme.tokens.color.surfaceElevated,
      borderColor: theme.tokens.color.surfaceElevated,
      textColor: theme.tokens.color.textPrimary,
    };
  }

  return {
    backgroundColor: theme.tokens.color.primary,
    borderColor: theme.tokens.color.primary,
    textColor: theme.tokens.color.textInverse,
  };
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      borderWidth: 1,
      borderRadius: theme.tokens.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidth: {
      width: '100%',
    },
    label: {
      fontWeight: theme.tokens.typography.fontWeight.semibold,
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.99 }],
    },
    disabled: {
      opacity: 0.75,
    },
  });
