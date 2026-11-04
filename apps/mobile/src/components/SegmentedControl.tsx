import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../theme';

type SegmentedOption = {
  value: string;
  label: string;
};

type SegmentedControlProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel?: string;
};

export default function SegmentedControl({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
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
      height: 44,
      padding: 3,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      gap: 3,
    },
    segment: {
      flex: 1,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentSelected: {
      backgroundColor: theme.color.primary,
    },
    segmentPressed: {
      opacity: 0.85,
    },
    label: {
      fontSize: theme.type.label.fontSize,
      fontWeight: '600',
      color: theme.color.textSecondary,
    },
    labelSelected: {
      color: theme.color.textInverse,
    },
  });
