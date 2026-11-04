import { StyleSheet, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type SkeletonLoaderProps = {
  lines?: number;
};

export default function SkeletonLoader({ lines = 3 }: SkeletonLoaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {Array.from({ length: lines }).map((_, index) => (
        <View key={index} style={styles.line} />
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.space[2],
    },
    line: {
      height: 14,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.color.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.color.border,
    },
  });
