import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type InputFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: { minHeight: 44, fontSize: 12 },
  md: { minHeight: 48, fontSize: 14 },
  lg: { minHeight: 52, fontSize: 16 },
} as const;

export default function InputField({
  label,
  error,
  size = 'md',
  style,
  ...rest
}: InputFieldProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const current = sizeMap[size];

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.tokens.color.textSecondary}
        style={[
          styles.input,
          {
            minHeight: current.minHeight,
            fontSize: current.fontSize,
            borderColor: error ? theme.tokens.color.error : theme.tokens.color.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.tokens.spacing[1],
    },
    label: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textPrimary,
      fontWeight: theme.tokens.typography.fontWeight.medium,
    },
    input: {
      borderWidth: 1,
      borderRadius: theme.tokens.radius.md,
      paddingHorizontal: theme.tokens.spacing[3],
      color: theme.tokens.color.textPrimary,
      backgroundColor: theme.tokens.color.surface,
    },
    error: {
      fontSize: theme.tokens.typography.fontSize.xs,
      color: theme.tokens.color.error,
    },
  });
