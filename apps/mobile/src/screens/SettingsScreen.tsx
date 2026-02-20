import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { auth } from '../services/firebase';
import { offlineQueue } from '../services/offlineQueue';
import { storage } from '../services/storage';
import { isUserAdmin, upsertUserProfile } from '../services/userProfile';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, mode, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const [queuedCount, setQueuedCount] = useState(0);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [compactBar, setCompactBar] = useState(false);

  useEffect(() => {
    offlineQueue.getAll().then((items) => setQueuedCount(items.length));
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        stickyHeaderIndices={[0]}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const shouldCompact = event.nativeEvent.contentOffset.y > theme.tokens.spacing[2];
          if (shouldCompact !== compactBar) {
            setCompactBar(shouldCompact);
          }
        }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.lg + insets.bottom },
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
          <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
          <IslandCard style={styles.card}>
            <Text style={styles.label}>{t('settings.theme')}</Text>
            <Text style={styles.value}>
              {mode === 'light' ? t('settings.light') : t('settings.dark')}
            </Text>
            <Button
              label={
                mode === 'light'
                  ? t('settings.switchToDark')
                  : t('settings.switchToLight')
              }
              variant="secondary"
              onPress={toggleTheme}
            />
          </IslandCard>
          <IslandCard style={styles.card}>
            <Text style={styles.label}>{t('settings.language')}</Text>
            <Text style={styles.value}>{t(`language.${language}`)}</Text>
            <View style={styles.languageRow}>
              {(['en', 'ha', 'yo', 'ig'] as const).map((code) => (
                <Button
                  key={code}
                  label={t(`language.${code}`)}
                  variant={language === code ? 'primary' : 'secondary'}
                  onPress={() => setLanguage(code)}
                />
              ))}
            </View>
          </IslandCard>
        </View>

        <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
        <IslandCard style={styles.card}>
          <Text style={styles.label}>{t('settings.offlineCache')}</Text>
          <Text style={styles.value}>{t('settings.offlineCacheDesc')}</Text>
          <Button
            label={t('settings.clearCache')}
            variant="secondary"
            onPress={refreshCache}
          />
        </IslandCard>
        <IslandCard style={styles.card}>
          <Text style={styles.label}>{t('settings.queuedReports')}</Text>
          <Text style={styles.value}>
            {t('settings.waitingToSync', { count: queuedCount })}
          </Text>
          <Button
            label={t('settings.syncNow')}
            variant="secondary"
            onPress={syncNow}
          />
        </IslandCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <IslandCard style={styles.card}>
          <Text style={styles.label}>{t('settings.miniTitle')}</Text>
          <Text style={styles.value}>
            {t('settings.miniDesc')}
          </Text>
        </IslandCard>
        <IslandCard style={styles.card}>
          <Text style={styles.label}>{t('settings.adminDashboard')}</Text>
          <Text style={styles.value}>{t('settings.adminDashboardDesc')}</Text>
          <Button
            label={isAdmin ? t('nav.admin') : t('common.adminRequired')}
            variant="secondary"
            onPress={() => navigation.navigate('Admin', undefined)}
            disabled={!isAdmin}
          />
        </IslandCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.adminAccess')}</Text>
        <IslandCard style={styles.card}>
          {authUser ? (
            <>
              <Text style={styles.label}>{t('settings.signedIn')}</Text>
              <Text style={styles.value}>{authUser.email}</Text>
              <Text style={styles.value}>
                {t('settings.adminStatus', {
                  value: isAdmin ? t('common.enabled') : t('common.disabled'),
                })}
              </Text>
              <Button
                label={authLoading ? t('settings.signingOut') : t('settings.signOut')}
                variant="secondary"
                onPress={handleSignOut}
                disabled={authLoading}
              />
            </>
          ) : (
            <Text style={styles.value}>{t('admin.signInPrompt')}</Text>
          )}
        </IslandCard>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('common.backToMap')}
          onPress={() => navigation.navigate('Public', { screen: 'Map' })}
        />
        <Button
          label={t('common.reportIncident')}
          variant="secondary"
          onPress={() => navigation.navigate('Public', { screen: 'Report' })}
        />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.tokens.spacing[4],
    gap: theme.tokens.spacing[4],
  },
  headerWrap: {
    marginBottom: theme.tokens.spacing[2],
    backgroundColor: theme.tokens.color.background,
    paddingBottom: theme.tokens.spacing[2],
  },
  section: {
    marginBottom: theme.tokens.spacing[2],
  },
  sectionTitle: {
    fontSize: theme.tokens.typography.fontSize.xs,
    fontWeight: theme.tokens.typography.fontWeight.bold,
    color: theme.tokens.color.textPrimary,
    marginBottom: theme.tokens.spacing[2],
    textTransform: 'uppercase',
  },
  card: {
    gap: theme.tokens.spacing[2],
  },
  label: {
    fontSize: theme.tokens.typography.fontSize.sm,
    fontWeight: theme.tokens.typography.fontWeight.semibold,
    color: theme.tokens.color.textPrimary,
  },
  value: {
    fontSize: theme.tokens.typography.fontSize.sm,
    color: theme.tokens.color.textSecondary,
  },
  actions: {
    marginTop: theme.tokens.spacing[3],
    gap: theme.tokens.spacing[2],
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.tokens.spacing[2],
  },
  });
