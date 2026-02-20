import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { type Theme, useTheme } from '../../theme';

type SelectFieldProps = {
  label?: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: 44,
  md: 48,
  lg: 52,
} as const;

export default function SelectField({
  label,
  value,
  placeholder = 'Select',
  onPress,
  disabled = false,
  error,
  size = 'md',
}: SelectFieldProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.select,
          {
            minHeight: sizeMap[size],
            borderColor: error ? theme.tokens.color.error : theme.tokens.color.border,
          },
          pressed && !disabled ? styles.pressed : null,
          disabled ? styles.disabled : null,
        ]}
      >
        <Text style={[styles.value, !value ? styles.placeholder : null]}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.tokens.color.textSecondary} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.tokens.spacing[1],
    },
    label: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textPrimary,
      fontWeight: theme.tokens.typography.fontWeight.medium,
    },
    select: {
      borderWidth: 1,
      borderRadius: theme.tokens.radius.md,
      paddingHorizontal: theme.tokens.spacing[3],
      backgroundColor: theme.tokens.color.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    value: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textPrimary,
    },
    placeholder: {
      color: theme.tokens.color.textSecondary,
    },
    pressed: {
      opacity: 0.9,
    },
    disabled: {
      opacity: 0.5,
    },
    error: {
      fontSize: theme.tokens.typography.fontSize.xs,
      color: theme.tokens.color.error,
    },
  });
