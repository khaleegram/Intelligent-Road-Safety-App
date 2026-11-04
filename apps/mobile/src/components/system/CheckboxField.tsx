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
            ? { backgroundColor: theme.color.primary, borderColor: theme.color.primary }
            : null,
        ]}
      >
        {checked ? (
          <Ionicons name="checkmark" size={14} color={theme.color.textInverse} />
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
      gap: theme.space[2],
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: theme.type.body.fontSize,
      color: theme.color.textPrimary,
    },
    disabled: {
      opacity: 0.5,
    },
  });
