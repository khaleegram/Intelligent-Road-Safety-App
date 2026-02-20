import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type RadioFieldProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export default function RadioField({
  label,
  selected,
  disabled = false,
  onSelect,
}: RadioFieldProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      style={[styles.row, disabled && styles.disabled]}
    >
      <View style={styles.outerCircle}>
        {selected ? <View style={styles.innerCircle} /> : null}
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
    outerCircle: {
      width: 22,
      height: 22,
      borderRadius: theme.tokens.radius.full,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.tokens.color.surface,
    },
    innerCircle: {
      width: 10,
      height: 10,
      borderRadius: theme.tokens.radius.full,
      backgroundColor: theme.tokens.color.primary,
    },
    label: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textPrimary,
    },
    disabled: {
      opacity: 0.5,
    },
  });
