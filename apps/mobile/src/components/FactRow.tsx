import { StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../theme';

type FactRowProps = {
  label: string;
  value: string;
};

export default function FactRow({ label, value }: FactRowProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[4],
      paddingVertical: theme.space[2],
    },
    label: {
      fontSize: 13,
      color: theme.color.textSecondary,
    },
    value: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: theme.color.textPrimary,
      textAlign: 'right',
    },
  });
