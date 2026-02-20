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
      style={[
        styles.track,
        value
          ? { backgroundColor: theme.tokens.color.primary, borderColor: theme.tokens.color.primary }
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
      borderRadius: theme.tokens.radius.full,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surfaceElevated,
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    thumb: {
      width: 24,
      height: 24,
      borderRadius: theme.tokens.radius.full,
      backgroundColor: theme.tokens.color.surface,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
    },
    thumbOn: {
      alignSelf: 'flex-end',
    },
    disabled: {
      opacity: 0.5,
    },
  });
