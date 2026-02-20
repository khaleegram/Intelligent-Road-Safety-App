import { StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type AvatarProps = {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 52,
} as const;

export default function Avatar({ initials, size = 'md' }: AvatarProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const dimension = sizeMap[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: theme.tokens.radius.full,
        },
      ]}
    >
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      color: theme.tokens.color.textPrimary,
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.bold,
    },
  });
