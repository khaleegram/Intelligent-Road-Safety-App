import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchAccidents, fetchHotspotById } from '../services/firestore';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, HotspotRecord } from '../types';

const DEGREE_WINDOW = 0.02;

export default function HotspotDetailScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { contentPadding } = useBreakpoint();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'HotspotDetail'>>();
  const { isAdmin } = useAdminAccess();
  const [hotspot, setHotspot] = useState<HotspotRecord | null>(null);
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [compactBar, setCompactBar] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [hotspotData, accidentData] = await Promise.all([
          fetchHotspotById(route.params.hotspotId),
          fetchAccidents(),
        ]);
        if (!mounted) return;
        setHotspot(hotspotData);
        setAccidents(accidentData);
      } catch (error) {
        console.error(error);
        Alert.alert(t('detail.loadFailedTitle'), t('detail.loadFailedHotspot'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [route.params.hotspotId, t]);

  const linkedAccidents = useMemo(() => {
    if (!hotspot) return [];
    return accidents.filter((item) => {
      const latDelta = Math.abs(item.latitude - hotspot.center_lat);
      const lngDelta = Math.abs(item.longitude - hotspot.center_lng);
      return latDelta <= DEGREE_WINDOW && lngDelta <= DEGREE_WINDOW;
    });
  }, [accidents, hotspot]);

  const trend = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    let in7d = 0;
    let in30d = 0;
    linkedAccidents.forEach((item) => {
      const created = Date.parse(item.created_at ?? item.timestamp);
      if (Number.isNaN(created)) return;
      const age = now - created;
      if (age <= sevenDaysMs) in7d += 1;
      if (age <= thirtyDaysMs) in30d += 1;
    });

    return { in7d, in30d };
  }, [linkedAccidents]);

  const explanation = useMemo(() => {
    if (!hotspot) return '';
    const counts = hotspot.severity_counts;
    if (counts) {
      return t('detail.severityMix', {
        fatal: counts.Fatal ?? 0,
        critical: counts.Critical ?? 0,
        minor: counts.Minor ?? 0,
        damage: counts['Damage Only'] ?? 0,
      });
    }
    if (hotspot.risk_score >= 0.8) return t('detail.riskHigh');
    if (hotspot.risk_score >= 0.5) return t('detail.riskMedium');
    return t('detail.riskLow');
  }, [hotspot, t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>{t('detail.loadingHotspot')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hotspot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>{t('detail.hotspotNotFound')}</Text>
          <Button label={t('common.back')} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

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
          { paddingHorizontal: contentPadding, paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow={t('detail.hotspotEyebrow')}
            title={t('detail.hotspotTitle')}
            subtitle={t('detail.hotspotSubtitle')}
            mode={isAdmin ? 'admin' : 'public'}
            compact={compactBar}
            isAdmin={isAdmin}
            onToggle={(next) => {
              if (next === 'public') {
                navigation.navigate('Public', { screen: 'Map' });
              } else {
                navigation.navigate('Admin', undefined);
              }
            }}
          />
        </View>
        <IslandCard style={styles.card}>
          <Text style={styles.label}>{t('detail.areaId')}</Text>
          <Text style={styles.value}>{hotspot.area_id}</Text>
          <Text style={styles.label}>{t('detail.severity')}</Text>
          <Text style={styles.value}>{hotspot.severity_level}</Text>
          <Text style={styles.label}>{t('detail.riskScore')}</Text>
          <Text style={styles.value}>{hotspot.risk_score}</Text>
          <Text style={styles.label}>{t('detail.center')}</Text>
          <Text style={styles.value}>
            {hotspot.center_lat.toFixed(5)}, {hotspot.center_lng.toFixed(5)}
          </Text>
          <Text style={styles.label}>{t('detail.lastUpdated')}</Text>
          <Text style={styles.value}>{hotspot.last_updated}</Text>
        </IslandCard>

        <IslandCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t('detail.whyHotspot')}</Text>
          <Text style={styles.value}>{explanation}</Text>
          <Text style={styles.value}>
            {t('detail.linkedTrend', {
              d7: hotspot.recent_7d_count ?? trend.in7d,
              d30: hotspot.recent_30d_count ?? trend.in30d,
            })}
          </Text>
          <Text style={styles.value}>
            {t('detail.linkedTotal', { count: linkedAccidents.length })}
          </Text>
        </IslandCard>

        <IslandCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t('detail.linkedIncidents')}</Text>
          {linkedAccidents.length === 0 ? (
            <Text style={styles.muted}>{t('detail.noLinked')}</Text>
          ) : (
            linkedAccidents.slice(0, 10).map((item) => (
              <View key={item.id ?? item.request_id} style={styles.row}>
                <Text style={styles.value}>
                  {item.severity} - {item.road_type}
                </Text>
                <Text style={styles.muted}>{item.created_at ?? item.timestamp}</Text>
                {item.id ? (
                  <Button
                    label={t('detail.openIncident')}
                    variant="secondary"
                    onPress={() => navigation.navigate('AccidentDetail', { accidentId: item.id! })}
                  />
                ) : null}
              </View>
            ))
          )}
        </IslandCard>

        <Button label={t('common.back')} variant="secondary" onPress={() => navigation.goBack()} />
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    headerWrap: {
      marginBottom: theme.tokens.spacing[2],
      backgroundColor: theme.tokens.color.background,
      paddingBottom: theme.tokens.spacing[2],
    },
    card: {
      gap: 6,
    },
    row: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 8,
      gap: 6,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.colors.text,
    },
    label: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    value: {
      fontSize: 12,
      color: theme.colors.text,
    },
    muted: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
  });
