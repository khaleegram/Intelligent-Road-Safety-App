import { StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

type AlertBannerProps = {
  title: string;
  message: string;
  variant?: AlertVariant;
};

export default function AlertBanner({
  title,
  message,
  variant = 'info',
}: AlertBannerProps) {
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
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: theme.tokens.radius.md,
      backgroundColor: theme.tokens.color.surfaceElevated,
      padding: theme.tokens.spacing[3],
      gap: theme.tokens.spacing[1],
    },
    title: {
      color: theme.tokens.color.textPrimary,
      fontSize: theme.tokens.typography.fontSize.sm,
      fontWeight: theme.tokens.typography.fontWeight.bold,
    },
    message: {
      color: theme.tokens.color.textSecondary,
      fontSize: theme.tokens.typography.fontSize.xs,
    },
  });
