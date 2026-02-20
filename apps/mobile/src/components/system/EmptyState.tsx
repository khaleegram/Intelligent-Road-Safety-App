import { StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type EmptyStateProps = {
  title: string;
  reason: string;
  nextStep: string;
};

export default function EmptyState({ title, reason, nextStep }: EmptyStateProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{reason}</Text>
      <Text style={styles.body}>{nextStep}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
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
    body: {
      color: theme.tokens.color.textSecondary,
      fontSize: theme.tokens.typography.fontSize.xs,
    },
  });
