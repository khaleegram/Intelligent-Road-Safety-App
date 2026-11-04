import { StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../theme';

type StatTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
};

export default function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
}: StatTileProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const valueColor =
    tone === 'accent'
      ? theme.color.primary
      : tone === 'success'
        ? theme.color.success
        : tone === 'warning'
          ? theme.color.warning
          : tone === 'danger'
            ? theme.color.error
            : theme.color.textPrimary;

  return (
    <View style={styles.container} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minWidth: 0,
      gap: theme.space[1],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
    },
    label: {
      color: theme.color.textSecondary,
      fontSize: theme.type.caption.fontSize,
      lineHeight: theme.type.caption.lineHeight,
      fontWeight: theme.type.caption.fontWeight,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    value: {
      fontSize: theme.type.display.fontSize,
      lineHeight: theme.type.display.lineHeight,
      fontWeight: theme.type.display.fontWeight,
      fontVariant: ['tabular-nums'],
    },
    hint: {
      color: theme.color.textSecondary,
      fontSize: theme.type.caption.fontSize,
      lineHeight: theme.type.caption.lineHeight,
    },
  });
