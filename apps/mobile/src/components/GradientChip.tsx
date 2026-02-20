import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { type Theme, useTheme } from '../theme';

type GradientChipProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
  accessibilityLabel?: string;
};

export default function GradientChip({
  label,
  active = false,
  disabled = false,
  style,
  onPress,
  accessibilityLabel,
}: GradientChipProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const backgroundColor = active
    ? theme.tokens.color.primary
    : theme.tokens.color.surfaceElevated;
  const borderColor = active ? theme.tokens.color.primary : theme.tokens.color.border;
  const textColor = active ? theme.tokens.color.textInverse : theme.tokens.color.textPrimary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, borderColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 40,
      paddingHorizontal: theme.tokens.spacing[3],
      borderWidth: 1,
      borderRadius: theme.tokens.radius.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.9,
    },
    label: {
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.medium,
    },
  });
