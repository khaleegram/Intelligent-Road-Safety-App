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
            borderColor: error ? theme.color.error : theme.color.border,
          },
          pressed && !disabled ? styles.pressed : null,
          disabled ? styles.disabled : null,
        ]}
      >
        <Text style={[styles.value, !value ? styles.placeholder : null]}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.color.textSecondary} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.space[1],
    },
    label: {
      fontSize: theme.type.body.fontSize,
      color: theme.color.textPrimary,
      fontWeight: '500',
    },
    select: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.space[3],
      backgroundColor: theme.color.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    value: {
      fontSize: theme.type.body.fontSize,
      color: theme.color.textPrimary,
    },
    placeholder: {
      color: theme.color.textSecondary,
    },
    pressed: {
      opacity: 0.9,
    },
    disabled: {
      opacity: 0.5,
    },
    error: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.error,
    },
  });
