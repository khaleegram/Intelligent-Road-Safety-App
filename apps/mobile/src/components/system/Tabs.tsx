import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type TabItem = {
  key: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

export default function Tabs({ items, activeKey, onChange }: TabsProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.row}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.key)}
            style={[
              styles.tab,
              active
                ? {
                    backgroundColor: theme.tokens.color.primary,
                    borderColor: theme.tokens.color.primary,
                  }
                : null,
            ]}
          >
            <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: theme.tokens.spacing[2],
    },
    tab: {
      minHeight: 44,
      paddingHorizontal: theme.tokens.spacing[3],
      borderRadius: theme.tokens.radius.full,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surface,
      justifyContent: 'center',
      alignItems: 'center',
      flexGrow: 1,
    },
    tabText: {
      color: theme.tokens.color.textPrimary,
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.medium,
    },
    tabTextActive: {
      color: theme.tokens.color.textInverse,
    },
  });
