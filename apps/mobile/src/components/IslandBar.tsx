import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';

type IslandBarProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  mode: 'public' | 'admin';
  isAdmin?: boolean;
  onToggle?: (mode: 'public' | 'admin') => void;
};

export default function IslandBar({
  title,
  subtitle,
  eyebrow,
  mode,
  isAdmin = false,
  onToggle,
}: IslandBarProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const canSwitchToAdmin = isAdmin;

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.toggle}>
        <Pressable
          onPress={() => onToggle?.('public')}
          style={[
            styles.toggleItem,
            mode === 'public' && styles.toggleItemActive,
          ]}
        >
          <Text
            style={[
              styles.toggleText,
              mode === 'public' && styles.toggleTextActive,
            ]}
          >
            {t('nav.public')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => (canSwitchToAdmin ? onToggle?.('admin') : null)}
          style={[
            styles.toggleItem,
            mode === 'admin' && styles.toggleItemActive,
            !canSwitchToAdmin && styles.toggleItemDisabled,
          ]}
        >
          <Text
            style={[
              styles.toggleText,
              mode === 'admin' && styles.toggleTextActive,
              !canSwitchToAdmin && styles.toggleTextDisabled,
            ]}
          >
            {t('nav.admin')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    textBlock: {
      flex: 1,
    },
    eyebrow: {
      fontSize: theme.font.small,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: theme.colors.textSoft,
      marginBottom: 2,
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
    toggle: {
      flexDirection: 'row',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceAlt,
    },
    toggleItem: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: 'transparent',
    },
    toggleItemActive: {
      backgroundColor: theme.colors.accent,
    },
    toggleItemDisabled: {
      opacity: 0.5,
    },
    toggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    toggleTextActive: {
      color: theme.colors.bg,
    },
    toggleTextDisabled: {
      color: theme.colors.textSoft,
    },
  });
