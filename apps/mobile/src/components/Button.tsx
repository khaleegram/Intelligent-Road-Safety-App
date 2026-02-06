import { Pressable, StyleSheet, Text, ViewStyle, View } from 'react-native';

import { type Theme, useTheme } from '../theme';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <View style={[styles.primarySolid, disabled ? styles.disabledContent : null]}>
          <Text
            style={[
              styles.text,
              styles.primaryText,
              disabled ? styles.disabledText : null,
            ]}
          >
            {label}
          </Text>
        </View>
      ) : (
        <View style={styles.secondaryContent}>
          <Text
            style={[
              styles.text,
              styles.secondaryText,
              disabled ? styles.disabledText : null,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
  fullWidth: {
    width: '100%',
  },
  primary: {
    padding: 0,
  },
  secondary: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  primarySolid: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
  },
  disabledContent: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  secondaryContent: {
    width: '100%',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.surfaceAlt,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: theme.colors.text,
  },
    disabledText: {
      color: theme.colors.textSoft,
    },
  });
