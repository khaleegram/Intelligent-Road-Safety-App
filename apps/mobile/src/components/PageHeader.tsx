import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Theme, useTheme } from '../theme';
import IconButton from './IconButton';

export type HeaderAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  badge?: boolean;
};

export type HeaderMenuItem = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  compact?: boolean;
  onBack?: () => void;
  actions?: HeaderAction[];
  menu?: HeaderMenuItem[];
  menuLabel?: string;
  closeLabel?: string;
};

const MAX_ACTIONS = 2;

export default function PageHeader({
  title,
  subtitle,
  compact = false,
  onBack,
  actions = [],
  menu = [],
  menuLabel = 'More',
  closeLabel = 'Close',
}: PageHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleActions = actions.slice(0, MAX_ACTIONS);
  const hasMenu = menu.length > 0;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {onBack ? (
        <IconButton
          icon={<Ionicons name="chevron-back" size={22} color={theme.color.textPrimary} />}
          accessibilityLabel={closeLabel}
          onPress={onBack}
        />
      ) : null}

      <View style={styles.titleWrap}>
        <Text numberOfLines={1} style={[styles.title, compact && styles.titleCompact]}>
          {title}
        </Text>
        {subtitle && !compact ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {visibleActions.map((action) => (
          <IconButton
            key={action.label}
            icon={<Ionicons name={action.icon} size={20} color={theme.color.textPrimary} />}
            accessibilityLabel={action.label}
            onPress={action.onPress ?? (() => undefined)}
            badge={action.badge}
          />
        ))}
        {hasMenu ? (
          <IconButton
            icon={
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.color.textPrimary} />
            }
            accessibilityLabel={menuLabel}
            onPress={() => setMenuOpen(true)}
          />
        ) : null}
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={() => setMenuOpen(false)}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.space[4]) }]}>
          <View style={styles.handle} />
          {menu.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                setMenuOpen(false);
                item.onPress();
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              {item.icon ? (
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.destructive ? theme.color.error : theme.color.textPrimary}
                />
              ) : null}
              <Text
                style={[styles.menuLabel, item.destructive && { color: theme.color.error }]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[3],
      paddingHorizontal: 0,
      backgroundColor: theme.color.background,
      borderBottomWidth: 0,
    },
    containerCompact: {
      paddingVertical: theme.space[1],
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    eyebrow: {
      fontSize: theme.type.caption.fontSize,
      fontWeight: theme.type.caption.fontWeight,
      color: theme.color.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '700',
      letterSpacing: -0.5,
      color: theme.color.textPrimary,
    },
    titleCompact: {
      fontSize: 20,
      lineHeight: 26,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.color.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[1],
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      borderTopWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      paddingTop: theme.space[2],
      paddingHorizontal: theme.space[4],
      gap: theme.space[1],
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.border,
      marginBottom: theme.space[2],
    },
    menuItem: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.md,
    },
    menuItemPressed: {
      backgroundColor: theme.color.surfaceElevated,
    },
    menuLabel: {
      fontSize: theme.type.body.fontSize,
      lineHeight: theme.type.body.lineHeight,
      fontWeight: '500',
      color: theme.color.textPrimary,
    },
  });
