import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import { adminEmails } from '../config/env';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { auth, db } from '../services/firebase';
import { offlineQueue } from '../services/offlineQueue';
import { storage } from '../services/storage';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await ensureUserProfile(user);
      if (adminEmails.includes(user.email.toLowerCase())) {
        setIsAdmin(true);
        return;
      }
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      setIsAdmin(snapshot.exists() && snapshot.data()?.is_admin === true);
    });
    return () => unsubscribe();
  }, []);

  const ensureUserProfile = async (user: User) => {
    const ref = doc(db, 'users', user.uid);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      await setDoc(ref, {
        email: user.email?.toLowerCase() ?? '',
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString(),
      });
      return;
    }
    await setDoc(
      ref,
      {
        email: user.email?.toLowerCase() ?? '',
        last_sign_in: new Date().toISOString(),
      },
      { merge: true }
    );
  };

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

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('settings.missingCredsTitle'), t('settings.missingCredsText'));
      return;
    }
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch (error) {
      Alert.alert(t('settings.signInFailedTitle'), t('settings.signInFailedText'));
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('settings.missingCredsTitle'), t('settings.missingCredsText'));
      return;
    }
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
      Alert.alert(t('settings.accountCreatedTitle'), t('settings.accountCreatedText'));
    } catch (error) {
      Alert.alert(t('settings.signUpFailedTitle'), t('settings.signUpFailedText'));
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setEmail('');
      setPassword('');
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
              navigation.navigate('Admin');
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
            onPress={() => navigation.navigate('Admin')}
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
            <>
              <Text style={styles.label}>{t('settings.signIn')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('common.email')}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder={t('common.password')}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Button
                label={authLoading ? t('settings.signingIn') : t('settings.signIn')}
                variant="secondary"
                onPress={handleSignIn}
                disabled={authLoading}
              />
              <Button
                label={
                  authLoading
                    ? t('settings.creatingAccount')
                    : t('common.createAccount')
                }
                variant="secondary"
                onPress={handleSignUp}
                disabled={authLoading}
              />
            </>
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
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
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
