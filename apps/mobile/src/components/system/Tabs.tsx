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
                    backgroundColor: theme.color.primary,
                    borderColor: theme.color.primary,
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
      gap: theme.space[2],
    },
    tab: {
      minHeight: 44,
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      justifyContent: 'center',
      alignItems: 'center',
      flexGrow: 1,
    },
    tabText: {
      color: theme.color.textPrimary,
      fontSize: theme.type.caption.fontSize,
      fontWeight: '500',
    },
    tabTextActive: {
      color: theme.color.textInverse,
    },
  });
