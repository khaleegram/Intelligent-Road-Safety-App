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
      ? theme.color.success
      : variant === 'warning'
        ? theme.color.warning
        : variant === 'error'
          ? theme.color.error
          : theme.color.info;

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
      borderRadius: theme.radius.md,
      backgroundColor: theme.color.surface,
      paddingHorizontal: theme.space[3],
      justifyContent: 'center',
    },
    message: {
      color: theme.color.textPrimary,
      fontSize: theme.type.body.fontSize,
    },
  });
