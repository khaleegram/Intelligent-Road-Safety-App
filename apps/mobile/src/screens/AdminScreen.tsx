import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import { missingFirebaseKeys } from '../config/env';
import { fetchAccidents, fetchHotspots, fetchUsers } from '../services/firestore';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, HotspotRecord, UserProfile } from '../types';
import type { RootStackParamList } from '../navigation/RootNavigator';

type AdminScreenProps = {
  initialTab?: 'overview' | 'hotspots' | 'reports' | 'users';
  showTabs?: boolean;
};

export default function AdminScreen({
  initialTab = 'overview',
  showTabs = true,
}: AdminScreenProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const styles = createStyles(theme);
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'hotspots' | 'reports' | 'users'>(
    initialTab === 'overview' ? 'hotspots' : initialTab
  );
  const { user: authUser, isAdmin, loading: authLoading } = useAdminAccess();

  const load = async () => {
    setLoading(true);
    const [accidentData, hotspotData, userData] = await Promise.all([
      fetchAccidents(),
      fetchHotspots(),
      fetchUsers(),
    ]);
    setAccidents(accidentData);
    setHotspots(hotspotData);
    setUsers(userData);
    setLastRefreshed(new Date());
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    load().catch((error) => {
      console.error('Admin load failed', error);
      setLoading(false);
    });
  }, [authLoading, isAdmin]);

  const verifiedCount = accidents.filter((item) => item.verified === true).length;
  const latestAccidents = accidents.slice(0, 20);
  const latestHotspots = hotspots.slice(0, 20);
  const latestUsers = users.slice(0, 20);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        <IslandBar
          eyebrow={t('admin.eyebrow')}
          title={t('admin.title')}
          subtitle={t('admin.subtitle')}
          mode="admin"
          isAdmin={isAdmin}
          onToggle={(next) => {
            if (next === 'public') {
              navigation.navigate('Public', { screen: 'Map' });
            }
          }}
        />

        {missingFirebaseKeys.length > 0 ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>{t('admin.firebaseMissingTitle')}</Text>
            <Text style={styles.bannerText}>
              {t('admin.firebaseMissingText', {
                keys: missingFirebaseKeys.join(', '),
              })}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('admin.overview')}</Text>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{accidents.length}</Text>
              <Text style={styles.statLabel}>{t('admin.accidents')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{verifiedCount}</Text>
              <Text style={styles.statLabel}>{t('admin.verified')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{hotspots.length}</Text>
              <Text style={styles.statLabel}>{t('admin.hotspots')}</Text>
            </View>
          </View>
          <Text style={styles.metaText}>
            {t('admin.lastRefresh', {
              value: lastRefreshed ? lastRefreshed.toLocaleString() : t('common.none'),
            })}
          </Text>
          {!authLoading && !authUser ? (
            <Text style={styles.emptyText}>{t('admin.signInPrompt')}</Text>
          ) : null}
          {!authLoading && authUser && !isAdmin ? (
            <Text style={styles.emptyText}>
              {t('admin.noAccess', { email: authUser.email ?? '' })}
            </Text>
          ) : null}
          {isAdmin ? (
            <Button
              label={loading ? t('common.refreshing') : t('admin.refreshData')}
              variant="secondary"
              onPress={load}
              disabled={loading}
            />
          ) : null}
        </View>

        {showTabs ? (
          <View style={styles.tabBar}>
            <Pressable
              style={[
                styles.tabItem,
                activeTab === 'hotspots' && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab('hotspots')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'hotspots' && styles.tabTextActive,
                ]}
              >
                {t('nav.hotspots')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.tabItem,
                activeTab === 'reports' && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab('reports')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'reports' && styles.tabTextActive,
                ]}
              >
                {t('nav.reports')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.tabItem,
                activeTab === 'users' && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab('users')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'users' && styles.tabTextActive,
                ]}
              >
                {t('nav.users')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {activeTab === 'reports' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('admin.recentReports')}</Text>
            {!isAdmin ? (
              <Text style={styles.emptyText}>{t('common.adminRequired')}</Text>
            ) : latestAccidents.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.noAccidents')}</Text>
            ) : (
              latestAccidents.map((item) => (
                <View
                  key={item.id ?? `${item.latitude}-${item.longitude}`}
                  style={styles.listRow}
                >
                  <Text style={styles.listTitle}>{item.severity}</Text>
                  <Text style={styles.listSubtitle}>
                    {item.road_type} - {item.weather}
                  </Text>
                  <Text style={styles.listMeta}>
                    {item.created_at ?? item.timestamp}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === 'hotspots' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('admin.recentHotspots')}</Text>
            {!isAdmin ? (
              <Text style={styles.emptyText}>{t('common.adminRequired')}</Text>
            ) : latestHotspots.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.noHotspots')}</Text>
            ) : (
              latestHotspots.map((item) => (
                <View key={item.area_id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{item.severity_level}</Text>
                  <Text style={styles.listSubtitle}>
                    {t('admin.accidentsScore', {
                      count: item.accident_count,
                      score: item.risk_score,
                    })}
                  </Text>
                  <Text style={styles.listMeta}>{item.last_updated}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === 'users' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('admin.users')}</Text>
            {!isAdmin ? (
              <Text style={styles.emptyText}>{t('common.adminRequired')}</Text>
            ) : latestUsers.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.noUsers')}</Text>
            ) : (
              latestUsers.map((item) => (
                <View key={item.id ?? item.email} style={styles.listRow}>
                  <Text style={styles.listTitle}>{item.email}</Text>
                  <Text style={styles.listSubtitle}>
                    {t('admin.userAdmin', {
                      value: item.is_admin ? t('common.enabled') : t('common.disabled'),
                    })}
                  </Text>
                  <Text style={styles.listMeta}>
                    {t('admin.lastSignIn', {
                      value: item.last_sign_in ?? item.created_at ?? t('common.none'),
                    })}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}
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
      gap: theme.spacing.sm,
    },
    banner: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      backgroundColor: '#fff7ed',
      borderWidth: 1,
      borderColor: '#fed7aa',
    },
    bannerTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#9a3412',
    },
    bannerText: {
      marginTop: 4,
      fontSize: 11,
      color: '#9a3412',
    },
    card: {
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    tabBar: {
      flexDirection: 'row',
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    tabItem: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tabItemActive: {
      backgroundColor: theme.colors.accent,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    tabTextActive: {
      color: theme.colors.bg,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    statRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    statBox: {
      flex: 1,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    metaText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    listRow: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    listTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
    },
    listSubtitle: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    listMeta: {
      fontSize: 10,
      color: theme.colors.textSoft,
      marginTop: 2,
    },
    emptyText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
  });
