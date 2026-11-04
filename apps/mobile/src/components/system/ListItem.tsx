import { Ionicons } from '@expo/vector-icons';
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

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${title}${subtitle ? `, ${subtitle}` : ''}` : undefined}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.color.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: 56,
      borderRadius: theme.radius.sm,
      paddingVertical: theme.space[3],
      paddingHorizontal: theme.space[2],
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[2],
    },
    pressed: {
      backgroundColor: theme.color.surfaceElevated,
    },
    textWrap: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.color.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    subtitle: {
      color: theme.color.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    meta: {
      color: theme.color.textSecondary,
      fontSize: theme.type.caption.fontSize,
    },
  });
