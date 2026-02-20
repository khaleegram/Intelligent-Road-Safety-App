import { StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type ToastVariant = 'info' | 'success' | 'warning' | 'error';

type ToastProps = {
  message: string;
  variant?: ToastVariant;
};

export default function Toast({ message, variant = 'info' }: ToastProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const borderColor =
    variant === 'success'
      ? theme.tokens.color.success
      : variant === 'warning'
        ? theme.tokens.color.warning
        : variant === 'error'
          ? theme.tokens.color.error
          : theme.tokens.color.info;

  return (
    <View style={[styles.container, { borderColor }]}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: 44,
      borderWidth: 1,
      borderRadius: theme.tokens.radius.md,
      backgroundColor: theme.tokens.color.surface,
      paddingHorizontal: theme.tokens.spacing[3],
      justifyContent: 'center',
    },
    message: {
      color: theme.tokens.color.textPrimary,
      fontSize: theme.tokens.typography.fontSize.sm,
    },
  });
