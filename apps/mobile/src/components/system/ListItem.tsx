import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type ListItemProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
};

export default function ListItem({ title, subtitle, meta, onPress }: ListItemProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </Wrapper>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      borderRadius: theme.tokens.radius.md,
      backgroundColor: theme.tokens.color.surfaceElevated,
      paddingVertical: theme.tokens.spacing[2],
      paddingHorizontal: theme.tokens.spacing[3],
      justifyContent: 'center',
      gap: theme.tokens.spacing[1],
    },
    title: {
      color: theme.tokens.color.textPrimary,
      fontSize: theme.tokens.typography.fontSize.sm,
      fontWeight: theme.tokens.typography.fontWeight.semibold,
    },
    subtitle: {
      color: theme.tokens.color.textSecondary,
      fontSize: theme.tokens.typography.fontSize.xs,
    },
    meta: {
      color: theme.tokens.color.textSecondary,
      fontSize: theme.tokens.typography.fontSize.xs,
    },
  });
