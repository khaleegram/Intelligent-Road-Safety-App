import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type InputFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: { minHeight: 46, fontSize: 14 },
  md: { minHeight: 54, fontSize: 15 },
  lg: { minHeight: 58, fontSize: 16 },
} as const;

export default function InputField({
  label,
  error,
  size = 'md',
  style,
  onFocus,
  onBlur,
  ...rest
}: InputFieldProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const current = sizeMap[size];
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: rest.editable === false }}
        placeholderTextColor={theme.color.textSecondary}
        selectionColor={theme.color.primary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            minHeight: current.minHeight,
            fontSize: current.fontSize,
            borderColor: error
              ? theme.color.error
              : focused
                ? theme.color.primary
                : theme.color.border,
            backgroundColor: focused
              ? theme.color.surface
              : theme.color.surfaceElevated,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.space[1],
    },
    label: {
      fontSize: theme.type.label.fontSize,
      lineHeight: theme.type.label.lineHeight,
      color: theme.color.textSecondary,
      fontWeight: theme.type.label.fontWeight,
    },
    input: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.space[4],
      color: theme.color.textPrimary,
      backgroundColor: theme.color.surfaceElevated,
    },
    error: {
      fontSize: theme.type.caption.fontSize,
      lineHeight: theme.type.caption.lineHeight,
      color: theme.color.error,
    },
  });
