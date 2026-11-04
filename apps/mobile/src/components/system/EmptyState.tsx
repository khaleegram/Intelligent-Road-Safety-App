import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type EmptyStateProps = {
  title: string;
  reason: string;
  nextStep: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export default function EmptyState({
  title,
  reason,
  nextStep,
  icon,
  action,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{reason}</Text>
      <Text style={styles.body}>{nextStep}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
      padding: theme.space[5],
      gap: theme.space[2],
    },
    icon: {
      marginBottom: theme.space[1],
    },
    title: {
      color: theme.color.textPrimary,
      fontSize: theme.type.heading.fontSize,
      lineHeight: theme.type.heading.lineHeight,
      fontWeight: theme.type.heading.fontWeight,
    },
    body: {
      color: theme.color.textSecondary,
      fontSize: theme.type.body.fontSize,
      lineHeight: theme.type.body.lineHeight,
    },
    action: {
      marginTop: theme.space[2],
    },
  });
