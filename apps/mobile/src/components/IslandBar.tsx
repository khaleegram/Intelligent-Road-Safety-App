import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';

type IslandBarProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  mode: 'public' | 'admin';
  isAdmin?: boolean;
  compact?: boolean;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  onToggle?: (mode: 'public' | 'admin') => void;
};

export default function IslandBar({
  title,
  subtitle,
  eyebrow,
  mode,
  isAdmin = false,
  compact = false,
  onSearchPress,
  onNotificationsPress,
  onProfilePress,
  onToggle,
}: IslandBarProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const collapseValue = useRef(new Animated.Value(compact ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(collapseValue, {
      toValue: compact ? 1 : 0,
      duration: theme.tokens.motion.normal,
      useNativeDriver: false,
    }).start();
  }, [collapseValue, compact, theme.tokens.motion.normal]);

  const canSwitchToAdmin = isAdmin && mode === 'public';
  const canSwitchToPublic = mode === 'admin';
  const showSubtitle = Boolean(subtitle);

  const minHeight = collapseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [
      theme.tokens.spacing[12] + theme.tokens.spacing[4],
      theme.tokens.spacing[12] + theme.tokens.spacing[2],
    ],
  });
  const verticalPadding = collapseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.tokens.spacing[2], theme.tokens.spacing[1]],
  });
  const subtitleOpacity = collapseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const subtitleHeight = collapseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.tokens.typography.fontSize.md, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          minHeight,
          paddingVertical: verticalPadding,
        },
      ]}
    >
      <View style={styles.leftIconWrap}>
        <Ionicons name="shield-checkmark" size={18} color={theme.tokens.color.primary} />
      </View>

      <View style={styles.titleWrap}>
        {eyebrow && !compact ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {showSubtitle ? (
          <Animated.View style={{ opacity: subtitleOpacity, height: subtitleHeight }}>
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.rightActions}>
        <IconAction
          icon="search"
          label="Search"
          onPress={onSearchPress}
          compact={compact}
        />
        <IconAction
          icon="notifications-outline"
          label="Notifications"
          onPress={onNotificationsPress}
          compact={compact}
        />
        <IconAction
          icon="person-circle-outline"
          label="Profile"
          onPress={onProfilePress}
          compact={compact}
        />
        {canSwitchToAdmin ? (
          <ModeAction
            label={t('nav.admin')}
            icon="swap-horizontal"
            onPress={() => {
              AccessibilityInfo.announceForAccessibility?.('Switched to admin view');
              onToggle?.('admin');
            }}
            compact={compact}
          />
        ) : null}
        {canSwitchToPublic ? (
          <ModeAction
            label={t('nav.public')}
            icon="swap-horizontal"
            onPress={() => {
              AccessibilityInfo.announceForAccessibility?.('Switched to public view');
              onToggle?.('public');
            }}
            compact={compact}
          />
        ) : null}
      </View>
    </Animated.View>
  );
}

type IconActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  compact: boolean;
};

function IconAction({ icon, label, onPress, compact }: IconActionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.iconAction, compact && styles.iconActionCompact]}
    >
      <Ionicons name={icon} size={16} color={theme.tokens.color.textPrimary} />
    </Pressable>
  );
}

type ModeActionProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  compact: boolean;
};

function ModeAction({ label, icon, onPress, compact }: ModeActionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${label} view`}
      onPress={onPress}
      style={[styles.modeAction, compact && styles.modeActionCompact]}
    >
      <Ionicons name={icon} size={14} color={theme.tokens.color.primary} />
      {!compact ? <Text style={styles.modeText}>{label}</Text> : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.tokens.radius.xl,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surfaceElevated,
      paddingHorizontal: theme.tokens.spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.tokens.spacing[2],
      shadowColor: theme.tokens.elevation.md.shadowColor,
      shadowOpacity: theme.tokens.elevation.md.shadowOpacity,
      shadowRadius: theme.tokens.elevation.md.shadowRadius,
      shadowOffset: theme.tokens.elevation.md.shadowOffset,
      elevation: theme.tokens.elevation.md.elevation,
    },
    leftIconWrap: {
      width: 44,
      height: 44,
      borderRadius: theme.tokens.radius.full,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.semibold,
      color: theme.tokens.color.textSecondary,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: theme.tokens.typography.fontSize.md,
      fontWeight: theme.tokens.typography.fontWeight.bold,
      color: theme.tokens.color.textPrimary,
    },
    subtitle: {
      fontSize: theme.tokens.typography.fontSize.xs,
      color: theme.tokens.color.textSecondary,
      marginTop: 1,
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.tokens.spacing[1],
    },
    iconAction: {
      width: 44,
      height: 44,
      borderRadius: theme.tokens.radius.full,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconActionCompact: {
      width: 40,
      height: 40,
    },
    modeAction: {
      minHeight: 44,
      borderRadius: theme.tokens.radius.full,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surface,
      paddingHorizontal: theme.tokens.spacing[2],
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.tokens.spacing[1],
    },
    modeActionCompact: {
      width: 40,
      justifyContent: 'center',
      paddingHorizontal: 0,
    },
    modeText: {
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.medium,
      color: theme.tokens.color.primary,
    },
  });
