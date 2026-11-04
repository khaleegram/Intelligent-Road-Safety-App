import { Pressable, StyleSheet, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type ToggleSwitchProps = {
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
};

export default function ToggleSwitch({
  value,
  disabled = false,
  onValueChange,
  accessibilityLabel,
}: ToggleSwitchProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.track,
        value
          ? { backgroundColor: theme.color.primary, borderColor: theme.color.primary }
          : null,
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.thumb, value ? styles.thumbOn : null]} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      width: 52,
      height: 32,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surfaceElevated,
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    thumb: {
      width: 24,
      height: 24,
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
    },
    thumbOn: {
      alignSelf: 'flex-end',
    },
    disabled: {
      opacity: 0.5,
    },
  });
