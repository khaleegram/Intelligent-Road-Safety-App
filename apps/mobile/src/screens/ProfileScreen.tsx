import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { signOut } from 'firebase/auth';

import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import Button from '../components/Button';
import Avatar from '../components/system/Avatar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { auth } from '../services/firebase';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
  const { user, isAdmin } = useAdminAccess();

  const [compactBar, setCompactBar] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const mode = route.params?.mode ?? 'public';
  const email = user?.email ?? 'unknown';
  const initials = email.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
      Alert.alert(t('profile.signOutFailedTitle'), t('profile.signOutFailedText'));
    } finally {
      setSigningOut(false);
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
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow={t('profile.eyebrow')}
            title={t('profile.title')}
            subtitle={t('profile.subtitle')}
            mode={mode}
            compact={compactBar}
            isAdmin={isAdmin}
            onToggle={(next) => {
              if (next === 'public') {
                navigation.navigate('Public', { screen: 'Map' });
                return;
              }
              navigation.navigate('Admin', undefined);
            }}
          />
        </View>

        <IslandCard style={styles.card}>
          <View style={styles.profileRow}>
            <Avatar initials={initials} size="lg" />
            <View style={styles.profileInfo}>
              <Text style={styles.email}>{email}</Text>
              <Text style={styles.meta}>{user?.uid ?? t('common.none')}</Text>
              <Text style={styles.meta}>
                {t('settings.adminStatus', {
                  value: isAdmin ? t('common.enabled') : t('common.disabled'),
                })}
              </Text>
            </View>
          </View>
        </IslandCard>

        <IslandCard style={styles.card}>
          <Button
            label={t('common.settings')}
            variant="secondary"
            onPress={() => navigation.navigate('Public', { screen: 'Settings' })}
          />
          <Button
            label={signingOut ? t('settings.signingOut') : t('common.signOut')}
            onPress={handleSignOut}
            disabled={signingOut}
          />
        </IslandCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.color.background,
    },
    content: {
      padding: theme.tokens.spacing[4],
      gap: theme.tokens.spacing[4],
      paddingBottom: theme.tokens.spacing[12],
    },
    headerWrap: {
      marginBottom: theme.tokens.spacing[2],
      backgroundColor: theme.tokens.color.background,
      paddingBottom: theme.tokens.spacing[2],
    },
    card: {
      gap: theme.tokens.spacing[2],
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.tokens.spacing[3],
    },
    profileInfo: {
      flex: 1,
      gap: theme.tokens.spacing[1],
    },
    email: {
      color: theme.tokens.color.textPrimary,
      fontSize: theme.tokens.typography.fontSize.md,
      fontWeight: theme.tokens.typography.fontWeight.semibold,
    },
    meta: {
      color: theme.tokens.color.textSecondary,
      fontSize: theme.tokens.typography.fontSize.xs,
    },
  });
