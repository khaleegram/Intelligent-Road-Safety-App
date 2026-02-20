import { StyleSheet, Text, View } from 'react-native';

import Button from '../Button';
import { type Theme, useTheme } from '../../theme';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: PaginationProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.row}>
      <Button label="Previous" variant="secondary" onPress={onPrev} disabled={page <= 1} />
      <Text style={styles.label}>
        {page} / {totalPages}
      </Text>
      <Button
        label="Next"
        variant="secondary"
        onPress={onNext}
        disabled={page >= totalPages}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.tokens.spacing[2],
    },
    label: {
      color: theme.tokens.color.textPrimary,
      fontSize: theme.tokens.typography.fontSize.sm,
      fontWeight: theme.tokens.typography.fontWeight.medium,
    },
  });
