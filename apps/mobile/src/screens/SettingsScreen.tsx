import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';

import IslandBar from '../components/IslandBar';
import OptionGrid from '../components/OptionGrid';
import SegmentedControl from '../components/SegmentedControl';
import ToggleSwitch from '../components/system/ToggleSwitch';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { auth } from '../services/firebase';
import { getAlertPreferences, setAlertPreferences } from '../services/alertPreferences';
import { getExpoPushToken } from '../services/notifications';
import { offlineQueue } from '../services/offlineQueue';
import { storage } from '../services/storage';
import { isUserAdmin, upsertUserProfile } from '../services/userProfile';
import { useI18n } from '../i18n';
import { type Theme, type ThemePreference, useTheme } from '../theme';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, preference, setPreference } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const { contentPadding } = useBreakpoint();
  const styles = createStyles(theme);
  const [queuedCount, setQueuedCount] = useState(0);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [compactBar, setCompactBar] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertRadius, setAlertRadius] = useState(200);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    offlineQueue.getAll().then((items) => setQueuedCount(items.length));
    getAlertPreferences().then((prefs) => {
      setAlertsEnabled(prefs.enabled);
      setAlertRadius(prefs.radiusMeters);
    });
    if (!__DEV__) return;
    getExpoPushToken()
      .then(setPushToken)
      .catch(() => setPushToken(null));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (!user?.email) {
        setIsAdmin(false);
        return;
      }
      await upsertUserProfile(user);
      setIsAdmin(await isUserAdmin(user.uid));
    });
    return () => unsubscribe();
  }, []);

  const refreshCache = async () => {
    await storage.remove('hotspots_cache_v1');
    await storage.remove('accidents_cache_v1');
    Alert.alert(t('settings.cacheClearedTitle'), t('settings.cacheClearedText'));
  };

  const syncNow = async () => {
    const result = await offlineQueue.sync();
    const remaining = await offlineQueue.getAll();
    setQueuedCount(remaining.length);
    if (result.synced === 0 && result.failed === 0) {
      Alert.alert(t('settings.upToDateTitle'), t('settings.upToDateText'));
      return;
    }
    Alert.alert(
      t('settings.syncCompleteTitle'),
      t('settings.syncCompleteText', {
        synced: result.synced,
        failed: result.failed,
      })
    );
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
    } finally {
      setAuthLoading(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      t('settings.signOutConfirmTitle'),
      t('settings.signOutConfirmText'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: () => {
            void handleSignOut();
          },
        },
      ]
    );
  };

  const confirmClearCache = () => {
    Alert.alert(
      t('settings.clearCacheConfirmTitle'),
      t('settings.clearCacheConfirmText'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearCache'),
          style: 'destructive',
          onPress: () => {
            void refreshCache();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        stickyHeaderIndices={[0]}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const shouldCompact = event.nativeEvent.contentOffset.y > theme.space[2];
          if (shouldCompact !== compactBar) {
            setCompactBar(shouldCompact);
          }
        }}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: contentPadding,
            paddingBottom: theme.space[8],
          },
        ]}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow={t('settings.eyebrow')}
            title={t('settings.title')}
            subtitle={t('settings.subtitle')}
            mode="public"
            compact={compactBar}
            isAdmin={isAdmin}
            onToggle={(next) => {
              if (next === 'admin') {
                navigation.navigate('Admin', undefined);
              }
            }}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.group}>
            {authUser ? (
              <View style={styles.accountRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(authUser.email?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {authUser.email}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    {isAdmin ? t('nav.admin') : t('settings.member')}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('admin.signInPrompt')}</Text>
            )}
            <View style={styles.divider} />
            <SettingRow
              icon="log-out-outline"
              title={authLoading ? t('settings.signingOut') : t('settings.signOut')}
              onPress={confirmSignOut}
              disabled={authLoading}
              destructive
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
          <View style={styles.group}>
            <View style={styles.groupBlock}>
              <Text style={styles.label}>{t('settings.theme')}</Text>
              <SegmentedControl
                accessibilityLabel={t('settings.theme')}
                value={preference}
                onChange={(value) => setPreference(value as ThemePreference)}
                options={[
                  { value: 'system', label: t('settings.themeSystem') },
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark', label: t('settings.themeDark') },
                ]}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.groupBlock}>
              <Text style={styles.label}>{t('settings.language')}</Text>
              <OptionGrid
                columns={2}
                accessibilityLabel={t('settings.language')}
                value={language}
                onChange={(value) => setLanguage(value as 'en' | 'ha' | 'yo' | 'ig')}
                options={[
                  { value: 'en', label: t('language.en') },
                  { value: 'ha', label: t('language.ha') },
                  { value: 'yo', label: t('language.yo') },
                  { value: 'ig', label: t('language.ig') },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.alerts')}</Text>
          <View style={styles.group}>
            <View style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('settings.alertsEnabled')}</Text>
                <Text style={styles.rowSubtitle}>
                  {alertsEnabled ? t('common.enabled') : t('common.disabled')}
                </Text>
              </View>
              <ToggleSwitch
                value={alertsEnabled}
                accessibilityLabel={t('settings.alertsEnabled')}
                onValueChange={async (next) => {
                  setAlertsEnabled(next);
                  await setAlertPreferences({ enabled: next, radiusMeters: alertRadius });
                }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.groupBlock}>
              <Text style={styles.label}>{t('settings.alertRadius')}</Text>
              <SegmentedControl
                accessibilityLabel={t('settings.alertRadius')}
                value={String(alertRadius)}
                onChange={(value) => {
                  const meters = Number(value);
                  setAlertRadius(meters);
                  void setAlertPreferences({
                    enabled: alertsEnabled,
                    radiusMeters: meters,
                  });
                }}
                options={[150, 200, 400].map((meters) => ({
                  value: String(meters),
                  label: `${meters} m`,
                }))}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
          <View style={styles.group}>
            <SettingRow
              icon="cloud-upload-outline"
              title={t('settings.queuedReports')}
              subtitle={t('settings.waitingToSync', { count: queuedCount })}
              onPress={syncNow}
              trailing={<Text style={styles.rowAction}>{t('settings.syncNow')}</Text>}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="trash-outline"
              title={t('settings.offlineCache')}
              subtitle={t('settings.offlineCacheDesc')}
              onPress={confirmClearCache}
              destructive
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.modules')}</Text>
          <View style={styles.group}>
            <SettingRow
              icon="alert-circle-outline"
              title={t('settings.openSos')}
              onPress={() => navigation.navigate('Sos')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="book-outline"
              title={t('settings.openEducation')}
              onPress={() => navigation.navigate('Education')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="medkit-outline"
              title={t('settings.openMedication')}
              onPress={() => navigation.navigate('Medication')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="chatbubble-ellipses-outline"
              title={t('settings.openFeedback')}
              onPress={() => navigation.navigate('Feedback')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="speedometer-outline"
              title={t('settings.openBehaviour')}
              onPress={() => navigation.navigate('Behaviour')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.group}>
            <SettingRow
              icon="information-circle-outline"
              title={t('settings.miniTitle')}
              subtitle={t('settings.miniDesc')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="shield-outline"
              title={t('settings.adminDashboard')}
              subtitle={isAdmin ? t('settings.adminDashboardDesc') : t('common.adminRequired')}
              onPress={() => navigation.navigate('Admin', undefined)}
              disabled={!isAdmin}
            />
            <View style={styles.divider} />
            {__DEV__ ? (
              <View style={styles.tokenBlock}>
                <Text style={styles.tokenLabel}>{t('settings.pushToken')}</Text>
                <Text style={styles.tokenValue} selectable>
                  {pushToken ?? t('settings.pushTokenUnavailable')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
};

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  disabled = false,
  destructive = false,
}: SettingRowProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const tone = destructive ? theme.color.error : theme.color.primary;

  const content = (
    <>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, destructive && { color: tone }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ??
        (onPress ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.color.textSecondary}
          />
        ) : null)}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    content: {
      padding: theme.space[4],
      gap: theme.space[5],
    },
    headerWrap: {
      marginBottom: theme.space[1],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    section: {
      gap: theme.space[2],
    },
    sectionTitle: {
      fontSize: theme.type.label.fontSize,
      fontWeight: theme.type.label.fontWeight,
      color: theme.color.textSecondary,
      marginLeft: theme.space[1],
    },
    group: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[1],
    },
    groupBlock: {
      paddingVertical: theme.space[3],
      gap: theme.space[2],
    },
    tokenBlock: {
      paddingVertical: theme.space[3],
      gap: 4,
    },
    tokenLabel: {
      fontSize: theme.type.label.fontSize,
      fontWeight: theme.type.label.fontWeight,
      color: theme.color.textSecondary,
    },
    tokenValue: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textPrimary,
      lineHeight: 18,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[3],
    },
    card: {
      gap: 0,
    },
    groupInner: {
      padding: theme.space[4],
      gap: theme.space[3],
    },
    listInner: {
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[1],
    },
    settingBlock: {
      gap: 4,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    value: {
      fontSize: theme.type.body.fontSize,
      color: theme.color.textSecondary,
    },
    segment: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.space[2],
      marginTop: 6,
    },
    chip: {
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: theme.color.primary,
      borderColor: theme.color.primary,
    },
    chipText: {
      fontSize: theme.type.body.fontSize,
      fontWeight: '600',
      color: theme.color.textSecondary,
    },
    chipTextActive: {
      color: theme.color.textInverse,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.color.border,
      marginVertical: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[3],
      minHeight: 56,
    },
    rowPressed: {
      opacity: 0.65,
    },
    rowDisabled: {
      opacity: 0.45,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.color.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    rowSubtitle: {
      fontSize: theme.type.caption.fontSize,
      lineHeight: 17,
      color: theme.color.textSecondary,
    },
    rowAction: {
      fontSize: theme.type.caption.fontSize,
      fontWeight: '700',
      color: theme.color.primary,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.color.textInverse,
    },
    emptyText: {
      paddingVertical: theme.space[3],
      fontSize: theme.type.body.fontSize,
      color: theme.color.textSecondary,
    },
    actions: {
      marginTop: theme.space[1],
      gap: theme.space[2],
    },
  });
