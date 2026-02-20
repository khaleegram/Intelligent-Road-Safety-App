import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import GradientChip from '../components/GradientChip';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import { missingFirebaseKeys } from '../config/env';
import {
  fetchAccidents,
  fetchAdminAlerts,
  fetchHotspots,
  fetchUsers,
} from '../services/firestore';
import { accidentsToCsv } from '../services/exportCsv';
import { shareCsvExport } from '../services/exportShare';
import { updateUserAdminRole } from '../services/adminRoles';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import type {
  AccidentRecord,
  AccidentSeverity,
  AdminAlert,
  HotspotRecord,
  UserProfile,
} from '../types';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { sendLocalRiskAlert } from '../services/notifications';

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
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRoleUid, setSavingRoleUid] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AccidentSeverity | 'All'>('All');
  const [daysFilter, setDaysFilter] = useState<1 | 7 | 30 | 'All'>('All');
  const [regionFilter, setRegionFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'hotspots' | 'reports' | 'users'>(
    initialTab === 'overview' ? 'hotspots' : initialTab
  );
  const [compactBar, setCompactBar] = useState(false);
  const { user: authUser, isAdmin, loading: authLoading } = useAdminAccess();

  const load = async () => {
    setLoading(true);
    const [accidentData, hotspotData, userData, alertData] = await Promise.all([
      fetchAccidents(),
      fetchHotspots(),
      fetchUsers(),
      fetchAdminAlerts(),
    ]);
    setAccidents(accidentData);
    setHotspots(hotspotData);
    setUsers(userData);
    setAlerts(alertData);
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
  const filteredAccidents = accidents
    .filter((item) => {
      const severityMatch =
        severityFilter === 'All' ? true : item.severity === severityFilter;
      const regionMatch =
        regionFilter.trim().length === 0
          ? true
          : `${item.road_type} ${item.weather}`
              .toLowerCase()
              .includes(regionFilter.toLowerCase());
      let daysMatch = true;
      if (daysFilter !== 'All') {
        const created = Date.parse(item.created_at ?? item.timestamp);
        const cutoff = Date.now() - daysFilter * 24 * 60 * 60 * 1000;
        daysMatch = !Number.isNaN(created) && created >= cutoff;
      }
      return severityMatch && regionMatch && daysMatch;
    });
  const latestAccidents = filteredAccidents.slice(0, 50);
  const latestHotspots = hotspots.slice(0, 20);
  const latestUsers = users.slice(0, 20);
  const recent24hCount = accidents.filter((item) => {
    const created = Date.parse(item.created_at ?? item.timestamp);
    if (Number.isNaN(created)) return false;
    return created >= Date.now() - 24 * 60 * 60 * 1000;
  }).length;
  const latestAlert = alerts[0];

  const exportReportsCsv = async () => {
    if (filteredAccidents.length === 0) {
      Alert.alert('No data', 'No report rows match the current filters.');
      return;
    }
    const csv = accidentsToCsv(filteredAccidents, { includeSensitive: true });
    await shareCsvExport({
      title: 'Accident reports CSV',
      filePrefix: 'admin-accident-reports',
      csv,
    });
  };

  const exportSpike24hCsv = async () => {
    const last24h = accidents.filter((item) => {
      const created = Date.parse(item.created_at ?? item.timestamp);
      if (Number.isNaN(created)) return false;
      return created >= Date.now() - 24 * 60 * 60 * 1000;
    });

    if (last24h.length === 0) {
      Alert.alert('No spike rows', 'No accident reports found in the last 24 hours.');
      return;
    }

    const csv = accidentsToCsv(last24h, { includeSensitive: true });
    await shareCsvExport({
      title: 'Spike 24h reports CSV',
      filePrefix: 'spike-24h-reports',
      csv,
    });
  };

  const inspectSpike = () => {
    setActiveTab('reports');
    setDaysFilter(1);
    setSeverityFilter('All');
    setRegionFilter('');
  };

  const toggleRole = async (user: UserProfile) => {
    if (!user.id) return;
    setSavingRoleUid(user.id);
    try {
      await updateUserAdminRole({
        targetUid: user.id,
        isAdmin: !(user.is_admin === true),
      });
      await load();
      Alert.alert('Role updated', `Admin set to ${user.is_admin ? 'No' : 'Yes'}.`);
    } catch (error) {
      console.error(error);
      Alert.alert('Role update failed', 'Unable to update admin role.');
    } finally {
      setSavingRoleUid(null);
    }
  };

  useEffect(() => {
    if (!isAdmin || !latestAlert) return;
    sendLocalRiskAlert({
      title: 'Admin alert',
      body: latestAlert.message,
      data: { alertId: latestAlert.id ?? '' },
    }).catch((error) => console.error('Admin alert notification failed', error));
  }, [isAdmin, latestAlert?.id]);

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
            eyebrow={t('admin.eyebrow')}
            title={t('admin.title')}
            subtitle={t('admin.subtitle')}
            mode="admin"
            compact={compactBar}
            isAdmin={isAdmin}
            onToggle={(next) => {
              if (next === 'public') {
                navigation.navigate('Public', { screen: 'Map' });
              }
            }}
          />
        </View>

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
        {recent24hCount >= 5 ? (
          <View style={styles.spikeBanner}>
            <Text style={styles.spikeTitle}>Spike alert</Text>
            <Text style={styles.spikeText}>
              {recent24hCount} reports were submitted in the last 24 hours.
            </Text>
            <View style={styles.spikeActions}>
              <Button label="Review 24h reports" variant="secondary" onPress={inspectSpike} />
              <Button label="Export 24h CSV" variant="secondary" onPress={exportSpike24hCsv} />
            </View>
          </View>
        ) : null}
        {latestAlert ? (
          <View style={styles.alertCard}>
            <Text style={styles.sectionTitle}>Latest admin alert</Text>
            <Text style={styles.listTitle}>{latestAlert.message}</Text>
            <Text style={styles.listMeta}>{latestAlert.created_at}</Text>
            {latestAlert.type === 'spike' ? (
              <Button label="Investigate spike now" variant="secondary" onPress={inspectSpike} />
            ) : null}
          </View>
        ) : null}

        <IslandCard style={styles.card}>
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
          {isAdmin ? (
            <Button
              label="Open Research Data View"
              variant="secondary"
              onPress={() => navigation.navigate('ResearchData')}
            />
          ) : null}
        </IslandCard>

        {showTabs ? (
          <View style={styles.tabBar}>
            <GradientChip
              style={styles.tabItem}
              active={activeTab === 'hotspots'}
              label={t('nav.hotspots')}
              onPress={() => setActiveTab('hotspots')}
            />
            <GradientChip
              style={styles.tabItem}
              active={activeTab === 'reports'}
              label={t('nav.reports')}
              onPress={() => setActiveTab('reports')}
            />
            <GradientChip
              style={styles.tabItem}
              active={activeTab === 'users'}
              label={t('nav.users')}
              onPress={() => setActiveTab('users')}
            />
          </View>
        ) : null}

        {activeTab === 'reports' ? (
          <IslandCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t('admin.recentReports')}</Text>
            <View style={styles.filterRow}>
              {(['All', 'Fatal', 'Critical', 'Minor', 'Damage Only'] as const).map((value) => (
                <GradientChip
                  key={value}
                  style={styles.chip}
                  active={severityFilter === value}
                  label={value}
                  onPress={() => setSeverityFilter(value)}
                />
              ))}
            </View>
            <View style={styles.filterRow}>
              {(['All', 1, 7, 30] as const).map((value) => (
                <GradientChip
                  key={String(value)}
                  style={styles.chip}
                  active={daysFilter === value}
                  label={value === 'All' ? 'All days' : value === 1 ? '24h' : `${value}d`}
                  onPress={() => setDaysFilter(value)}
                />
              ))}
            </View>
            <TextInput
              style={styles.filterInput}
              placeholder="Filter by road/weather text"
              placeholderTextColor={theme.tokens.color.textSecondary}
              value={regionFilter}
              onChangeText={setRegionFilter}
            />
            <Button
              label="Export CSV"
              variant="secondary"
              onPress={exportReportsCsv}
              disabled={latestAccidents.length === 0}
            />
            {!isAdmin ? (
              <Text style={styles.emptyText}>{t('common.adminRequired')}</Text>
            ) : latestAccidents.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.noAccidents')}</Text>
            ) : (
              latestAccidents.map((item) => (
                <Pressable
                  key={item.id ?? `${item.latitude}-${item.longitude}`}
                  style={styles.listRow}
                  onPress={() => {
                    if (item.id) {
                      navigation.navigate('AccidentDetail', { accidentId: item.id });
                    }
                  }}
                >
                  <Text style={styles.listTitle}>{item.severity}</Text>
                  <Text style={styles.listSubtitle}>
                    {item.road_type} - {item.weather}
                  </Text>
                  <Text style={styles.listMeta}>
                    {item.created_at ?? item.timestamp}
                  </Text>
                </Pressable>
              ))
            )}
          </IslandCard>
        ) : null}

        {activeTab === 'hotspots' ? (
          <IslandCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t('admin.recentHotspots')}</Text>
            {!isAdmin ? (
              <Text style={styles.emptyText}>{t('common.adminRequired')}</Text>
            ) : latestHotspots.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.noHotspots')}</Text>
            ) : (
              latestHotspots.map((item) => (
                <Pressable
                  key={item.area_id}
                  style={styles.listRow}
                  onPress={() =>
                    navigation.navigate('HotspotDetail', { hotspotId: item.area_id })
                  }
                >
                  <Text style={styles.listTitle}>{item.severity_level}</Text>
                  <Text style={styles.listSubtitle}>
                    {t('admin.accidentsScore', {
                      count: item.accident_count,
                      score: item.risk_score,
                    })}
                  </Text>
                  <Text style={styles.listMeta}>{item.last_updated}</Text>
                </Pressable>
              ))
            )}
          </IslandCard>
        ) : null}

        {activeTab === 'users' ? (
          <IslandCard style={styles.card}>
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
                  <Button
                    label={item.is_admin ? 'Revoke admin' : 'Grant admin'}
                    variant="secondary"
                    onPress={() => toggleRole(item)}
                    disabled={!item.id || savingRoleUid === item.id}
                  />
                </View>
              ))
            )}
          </IslandCard>
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
      gap: theme.spacing.md,
    },
    headerWrap: {
      marginBottom: theme.tokens.spacing[2],
      backgroundColor: theme.tokens.color.background,
      paddingBottom: theme.tokens.spacing[2],
    },
    banner: {
      marginTop: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.tokens.color.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
    },
    bannerTitle: {
      fontSize: theme.tokens.typography.fontSize.sm,
      fontWeight: '700',
      color: theme.tokens.color.textPrimary,
    },
    bannerText: {
      marginTop: 4,
      fontSize: theme.tokens.typography.fontSize.xs,
      color: theme.tokens.color.textSecondary,
    },
    card: {
      gap: theme.spacing.md,
    },
    tabBar: {
      flexDirection: 'row',
      gap: theme.tokens.spacing[2],
    },
    tabItem: {
      flex: 1,
      minHeight: 40,
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
      padding: theme.spacing.md,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.tokens.color.surfaceElevated,
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
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      flexGrow: 0,
    },
    filterInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.colors.text,
      backgroundColor: theme.tokens.color.surfaceElevated,
    },
    listRow: {
      marginTop: theme.tokens.spacing[2],
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      borderRadius: theme.tokens.radius.md,
      backgroundColor: theme.tokens.color.surfaceElevated,
      gap: 5,
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
    spikeBanner: {
      marginTop: theme.spacing.xs,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.tokens.color.warning,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.tokens.color.surfaceElevated,
      gap: 4,
    },
    spikeTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.tokens.color.warning,
    },
    spikeText: {
      fontSize: 11,
      color: theme.tokens.color.warning,
    },
    spikeActions: {
      marginTop: 6,
      gap: 6,
    },
    alertCard: {
      marginTop: theme.spacing.xs,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      gap: 4,
    },
  });
