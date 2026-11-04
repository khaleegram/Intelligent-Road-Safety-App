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
      marginBottom: theme.space[3],
    },
  eyebrow: {
    fontSize: theme.type.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.color.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: theme.type.title.fontSize,
    fontWeight: '700',
    color: theme.color.textPrimary,
  },
    subtitle: {
      marginTop: 4,
      fontSize: theme.type.body.fontSize,
      color: theme.color.textSecondary,
    },
  });
