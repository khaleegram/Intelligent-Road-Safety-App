import { Ionicons } from '@expo/vector-icons';
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

  const backgroundColor = active ? theme.color.primary : theme.color.surfaceElevated;
  const borderColor = active ? theme.color.primary : theme.color.border;
  const textColor = active ? theme.color.textInverse : theme.color.textPrimary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, borderColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {active ? <Ionicons name="checkmark" size={14} color={textColor} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 44,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: theme.space[3],
      borderWidth: 1,
      borderRadius: theme.radius.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.85,
    },
    label: {
      fontSize: theme.type.label.fontSize,
      lineHeight: theme.type.label.lineHeight,
      fontWeight: theme.type.label.fontWeight,
    },
  });
