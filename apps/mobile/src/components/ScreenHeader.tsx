import { StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
};

export default function ScreenHeader({ title, subtitle, eyebrow }: ScreenHeaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sm,
    },
  eyebrow: {
    fontSize: theme.font.small,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textSoft,
    marginBottom: 4,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: '700',
    color: theme.colors.text,
  },
    subtitle: {
      marginTop: 4,
      fontSize: theme.font.subtitle,
      color: theme.colors.textMuted,
    },
  });
