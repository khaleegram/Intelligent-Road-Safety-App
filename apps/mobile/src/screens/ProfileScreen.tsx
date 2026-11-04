import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { signOut } from 'firebase/auth';

import IslandBar from '../components/IslandBar';
import Button from '../components/Button';
import StatTile from '../components/StatTile';
import Avatar from '../components/system/Avatar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { auth } from '../services/firebase';
import { fetchAccidents } from '../services/firestore';
import { fetchLocalAlerts } from '../services/localAlerts';
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
  const [reportCount, setReportCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  const mode = route.params?.mode ?? 'public';
  const email = user?.email ?? 'unknown';
  const initials = email.slice(0, 2).toUpperCase();

  useEffect(() => {
    let active = true;
    Promise.all([fetchAccidents().catch(() => []), fetchLocalAlerts()])
      .then(([accidents, alerts]) => {
        if (!active) return;
        const uid = user?.uid;
        setReportCount(uid ? accidents.filter((a) => a.reporter_uid === uid).length : 0);
        setAlertCount(alerts.length);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.uid]);

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

  const confirmSignOut = () => {
    Alert.alert(
      t('settings.signOutConfirmTitle'),
      t('settings.signOutConfirmText'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.signOut'),
          style: 'destructive',
          onPress: () => {
            void handleSignOut();
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

        <View style={styles.section}>
          <View style={styles.accountRow}>
            <Avatar initials={initials} size="lg" />
            <View style={styles.profileInfo}>
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
              <Text style={styles.meta}>
                {isAdmin ? t('nav.admin') : t('settings.member')}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatTile label={t('nav.reports')} value={String(reportCount)} />
            <StatTile label={t('nav.notifications')} value={String(alertCount)} />
          </View>

          {isAdmin ? (
            <Button
              label={t('settings.adminDashboard')}
              variant="secondary"
              fullWidth
              onPress={() => navigation.navigate('Admin', undefined)}
            />
          ) : null}

          <Button
            label={signingOut ? t('settings.signingOut') : t('common.signOut')}
            variant="destructive"
            fullWidth
            loading={signingOut}
            onPress={confirmSignOut}
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
      backgroundColor: theme.color.background,
    },
    content: {
      padding: theme.space[4],
      gap: theme.space[5],
      paddingBottom: theme.space[12],
    },
    headerWrap: {
      marginBottom: theme.space[1],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    section: {
      gap: theme.space[4],
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.space[3],
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
    },
    profileInfo: {
      flex: 1,
      gap: 2,
    },
    email: {
      color: theme.color.textPrimary,
      fontSize: 18,
      fontWeight: '600',
    },
    meta: {
      color: theme.color.textSecondary,
      fontSize: theme.type.caption.fontSize,
    },
  });
