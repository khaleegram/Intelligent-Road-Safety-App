import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { type Theme, useTheme } from '../../theme';

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export default function CheckboxField({
  label,
  checked,
  disabled = false,
  onChange,
}: CheckboxFieldProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.row, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: theme.tokens.color.primary, borderColor: theme.tokens.color.primary }
            : null,
        ]}
      >
        {checked ? (
          <Ionicons name="checkmark" size={14} color={theme.tokens.color.textInverse} />
        ) : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.tokens.spacing[2],
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: theme.tokens.radius.sm,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textPrimary,
    },
    disabled: {
      opacity: 0.5,
    },
  });
