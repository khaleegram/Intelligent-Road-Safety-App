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
import FactRow from '../components/FactRow';
import IslandBar from '../components/IslandBar';
import OptionGrid from '../components/OptionGrid';
import SegmentedControl from '../components/SegmentedControl';
import StatTile from '../components/StatTile';
import { missingFirebaseKeys } from '../config/env';
import {
  fetchAccidents,
  fetchAdminAlerts,
  fetchHotspots,
  fetchSemInsights,
  fetchUsers,
} from '../services/firestore';
import { fetchRiskPredictions } from '../services/riskPredictions';
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
  RiskPrediction,
  SemInsight,
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
  const [riskMeta, setRiskMeta] = useState<RiskPrediction | null>(null);
  const [semInsight, setSemInsight] = useState<SemInsight | null>(null);
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
    const [accidentData, hotspotData, userData, alertData, riskData, semData] =
      await Promise.all([
        fetchAccidents(),
        fetchHotspots(),
        fetchUsers(),
        fetchAdminAlerts(),
        fetchRiskPredictions().catch(() => []),
        fetchSemInsights().catch(() => null),
      ]);
    setAccidents(accidentData);
    setHotspots(hotspotData);
    setUsers(userData);
    setAlerts(alertData);
    setRiskMeta(riskData[0] ?? null);
    setSemInsight(semData);
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
  const formatMetric = (value?: number) =>
    typeof value === 'number' ? value.toFixed(2) : t('common.none');

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
          const shouldCompact = event.nativeEvent.contentOffset.y > theme.space[2];
          if (shouldCompact !== compactBar) {
            setCompactBar(shouldCompact);
          }
        }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.space[6] + insets.bottom },
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
            <Text style={styles.spikeTitle}>{t('admin.spikeAlert')}</Text>
            <Text style={styles.spikeText}>
              {t('admin.spikeText', { count: recent24hCount })}
            </Text>
            <View style={styles.spikeActions}>
              <Button label={t('admin.review24h')} variant="secondary" onPress={inspectSpike} />
              <Button
                label={t('admin.export24h')}
                variant="secondary"
                onPress={exportSpike24hCsv}
              />
            </View>
          </View>
        ) : null}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t('admin.overview')}</Text>
          <View style={styles.statRow}>
            <StatTile label={t('admin.accidents')} value={String(accidents.length)} />
            <StatTile
              label={t('admin.verified')}
              value={String(verifiedCount)}
              tone="success"
            />
            <StatTile
              label={t('admin.hotspots')}
              value={String(hotspots.length)}
              tone="warning"
            />
          </View>
          <Text style={styles.metaText}>
            {t('admin.lastRefresh', {
              value: lastRefreshed ? lastRefreshed.toLocaleString() : t('common.none'),
            })}
          </Text>
          <Text style={styles.metaText}>
            {riskMeta
              ? t('admin.mlRiskMeta', {
                  version: riskMeta.model_version,
                  updated: riskMeta.updated_at,
                })
              : t('admin.mlRiskNone')}
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
              label={t('admin.openResearch')}
              variant="secondary"
              onPress={() => navigation.navigate('ResearchData')}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t('admin.researchInsights')}</Text>
          <Text style={styles.metaText}>{t('admin.researchInsightsNote')}</Text>
          {semInsight ? (
            <>
              <Text style={styles.sectionTitle}>{t('admin.researchFitLabel')}</Text>
              <Text style={styles.metaText}>
                {t('admin.semModelVersion', {
                  value: semInsight.model_version ?? t('common.none'),
                })}
              </Text>
              <FactRow label="CFI" value={formatMetric(semInsight.fit?.cfi)} />
              <FactRow label="TLI" value={formatMetric(semInsight.fit?.tli)} />
              <FactRow label="RMSEA" value={formatMetric(semInsight.fit?.rmsea)} />
              <FactRow label="SRMR" value={formatMetric(semInsight.fit?.srmr)} />
              {semInsight.policy_recommendations?.length ? (
                <>
                  <Text style={styles.sectionTitle}>{t('admin.semRecommendations')}</Text>
                  {semInsight.policy_recommendations.map((recommendation) => (
                    <Text key={recommendation} style={styles.metaText}>
                      • {recommendation}
                    </Text>
                  ))}
                </>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyText}>{t('admin.semInsightsEmpty')}</Text>
          )}
        </View>

        {showTabs ? (
          <SegmentedControl
            accessibilityLabel={t('admin.overview')}
            value={activeTab}
            onChange={(value) => setActiveTab(value as typeof activeTab)}
            options={[
              { value: 'hotspots', label: t('nav.hotspots') },
              { value: 'reports', label: t('nav.reports') },
              { value: 'users', label: t('nav.users') },
            ]}
          />
        ) : null}

        {activeTab === 'reports' ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>{t('admin.recentReports')}</Text>
            <OptionGrid
              columns={3}
              accessibilityLabel={t('admin.recentReports')}
              value={severityFilter}
              onChange={(value) => setSeverityFilter(value as typeof severityFilter)}
              options={[
                { value: 'All', label: t('common.all') },
                { value: 'Fatal', label: t('options.severity.Fatal') },
                { value: 'Critical', label: t('options.severity.Critical') },
                { value: 'Minor', label: t('options.severity.Minor') },
                { value: 'Damage Only', label: t('options.severity.Damage Only') },
              ]}
            />
            <SegmentedControl
              accessibilityLabel={t('admin.recentReports')}
              value={String(daysFilter)}
              onChange={(value) =>
                setDaysFilter(
                  value === 'All' ? 'All' : (Number(value) as 1 | 7 | 30)
                )
              }
              options={[
                { value: 'All', label: t('common.all') },
                { value: '1', label: '24h' },
                { value: '7', label: '7d' },
                { value: '30', label: '30d' },
              ]}
            />
            <TextInput
              style={styles.filterInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.color.textSecondary}
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
          </View>
        ) : null}

        {activeTab === 'hotspots' ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>{t('admin.recentHotspots')}</Text>
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
          </View>
        ) : null}

        {activeTab === 'users' ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>{t('admin.users')}</Text>
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
                    label={
                      item.is_admin ? t('admin.revokeAdmin') : t('admin.grantAdmin')
                    }
                    variant="secondary"
                    onPress={() => toggleRole(item)}
                    disabled={!item.id || savingRoleUid === item.id}
                  />
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
      backgroundColor: theme.color.background,
    },
    content: {
      padding: theme.space[6],
      gap: theme.space[4],
    },
    headerWrap: {
      marginBottom: theme.space[2],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    banner: {
      marginTop: theme.space[2],
      padding: theme.space[4],
      borderRadius: theme.radius.sm,
      backgroundColor: theme.color.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.color.border,
    },
    bannerTitle: {
      fontSize: theme.type.body.fontSize,
      fontWeight: '700',
      color: theme.color.textPrimary,
    },
    bannerText: {
      marginTop: 4,
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    card: {
      gap: theme.space[4],
    },
    tabBar: {
      flexDirection: 'row',
      gap: theme.space[2],
    },
    tabItem: {
      flex: 1,
      minHeight: 40,
    },
    sectionTitle: {
      fontSize: theme.type.label.fontSize,
      fontWeight: theme.type.label.fontWeight,
      color: theme.color.textSecondary,
    },
    section: {
      gap: theme.space[2],
    },
    sectionHeading: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: theme.color.textPrimary,
    },
    statRow: {
      flexDirection: 'row',
      gap: theme.space[2],
    },
    metaText: {
      fontSize: 11,
      color: theme.color.textSecondary,
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
      borderColor: theme.color.border,
      borderRadius: theme.radius.sm,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: theme.type.body.fontSize,
      color: theme.color.textPrimary,
      backgroundColor: theme.color.surfaceElevated,
    },
    listRow: {
      marginTop: theme.space[2],
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.color.surfaceElevated,
      gap: 5,
    },
    listTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    listSubtitle: {
      fontSize: 11,
      color: theme.color.textSecondary,
      marginTop: 2,
    },
    listMeta: {
      fontSize: 10,
      color: theme.color.textSecondary,
      marginTop: 2,
    },
    emptyText: {
      fontSize: 12,
      color: theme.color.textSecondary,
    },
    spikeBanner: {
      marginTop: theme.space[2],
      padding: theme.space[3],
      borderWidth: 1,
      borderColor: theme.color.warning,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.color.surfaceElevated,
      gap: 4,
    },
    spikeTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.color.warning,
    },
    spikeText: {
      fontSize: 11,
      color: theme.color.warning,
    },
    spikeActions: {
      marginTop: 6,
      gap: 6,
    },
    alertCard: {
      marginTop: theme.space[2],
      padding: theme.space[3],
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.color.surface,
      gap: 4,
    },
  });
