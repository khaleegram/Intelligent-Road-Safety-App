import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../theme';

export type OptionGridItem = {
  value: string;
  label: string;
};

type OptionGridProps = {
  options: OptionGridItem[];
  value?: string;
  onChange: (value: string) => void;
  columns?: 2 | 3;
  accessibilityLabel?: string;
};

export default function OptionGrid({
  options,
  value,
  onChange,
  columns = 3,
  accessibilityLabel,
}: OptionGridProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.cell,
              columns === 2 ? styles.cellTwo : styles.cellThree,
              selected && styles.cellSelected,
              pressed && styles.cellPressed,
            ]}
          >
            <Text
              numberOfLines={2}
              style={[styles.label, selected && styles.labelSelected]}
            >
              {option.label}
            </Text>
            {selected ? (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.color.primary}
                style={styles.check}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: theme.space[2],
      rowGap: theme.space[2],
    },
    cell: {
      minHeight: 48,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space[2],
    },
    cellTwo: {
      width: '48.5%',
    },
    cellThree: {
      width: '31.5%',
    },
    cellSelected: {
      borderColor: theme.color.primary,
      backgroundColor: theme.color.surfaceElevated,
    },
    cellPressed: {
      opacity: 0.8,
    },
    label: {
      fontSize: theme.type.label.fontSize,
      lineHeight: theme.type.label.lineHeight,
      fontWeight: '500',
      color: theme.color.textPrimary,
      textAlign: 'center',
    },
    labelSelected: {
      color: theme.color.primary,
      fontWeight: '600',
    },
    check: {
      position: 'absolute',
      top: 4,
      right: 4,
    },
  });
