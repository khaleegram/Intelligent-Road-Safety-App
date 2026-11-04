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
      ? theme.color.success
      : variant === 'warning'
        ? theme.color.warning
        : variant === 'error'
          ? theme.color.error
          : theme.color.info;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.container, { borderColor }]}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      backgroundColor: theme.color.surfaceElevated,
      padding: theme.space[3],
      gap: theme.space[1],
    },
    title: {
      color: theme.color.textPrimary,
      fontSize: theme.type.label.fontSize,
      lineHeight: theme.type.label.lineHeight,
      fontWeight: theme.type.label.fontWeight,
    },
    message: {
      color: theme.color.textSecondary,
      fontSize: theme.type.caption.fontSize,
      lineHeight: theme.type.caption.lineHeight,
    },
  });
