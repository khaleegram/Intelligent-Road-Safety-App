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
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        <IslandBar
          eyebrow={t('settings.eyebrow')}
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
          mode="public"
          isAdmin={isAdmin}
          onToggle={(next) => {
            if (next === 'admin') {
              navigation.navigate('Admin', undefined);
            }
          }}
        />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
          <View style={styles.card}>
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
          </View>
          <View style={styles.card}>
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
          </View>
        </View>

        <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.offlineCache')}</Text>
          <Text style={styles.value}>{t('settings.offlineCacheDesc')}</Text>
          <Button
            label={t('settings.clearCache')}
            variant="secondary"
            onPress={refreshCache}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.queuedReports')}</Text>
          <Text style={styles.value}>
            {t('settings.waitingToSync', { count: queuedCount })}
          </Text>
          <Button
            label={t('settings.syncNow')}
            variant="secondary"
            onPress={syncNow}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.miniTitle')}</Text>
          <Text style={styles.value}>
            {t('settings.miniDesc')}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.adminDashboard')}</Text>
          <Text style={styles.value}>{t('settings.adminDashboardDesc')}</Text>
          <Button
            label={isAdmin ? t('nav.admin') : t('common.adminRequired')}
            variant="secondary"
            onPress={() => navigation.navigate('Admin', undefined)}
            disabled={!isAdmin}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.adminAccess')}</Text>
        <View style={styles.card}>
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
        </View>
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
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  value: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  });
