import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import FactRow from '../components/FactRow';
import IslandBar from '../components/IslandBar';
import Button from '../components/Button';
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
          const shouldCompact = event.nativeEvent.contentOffset.y > theme.space[2];
          if (shouldCompact !== compactBar) {
            setCompactBar(shouldCompact);
          }
        }}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: contentPadding, paddingBottom: theme.space[6] + insets.bottom },
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
            onBack={() => navigation.goBack()}
            onToggle={(next) => {
              if (next === 'public') {
                navigation.navigate('Public', { screen: 'Map' });
              } else {
                navigation.navigate('Admin', undefined);
              }
            }}
          />
        </View>
        <View style={styles.hero}>
          <Text style={styles.heroValue}>{hotspot.risk_score}</Text>
          <Text style={styles.heroLabel}>{t('detail.riskScore')}</Text>
          <Text style={styles.heroMeta}>
            {hotspot.severity_level} · {hotspot.accident_count}
          </Text>
        </View>

        <View style={styles.group}>
          <FactRow label={t('detail.areaId')} value={hotspot.area_id} />
          <View style={styles.divider} />
          <FactRow
            label={t('detail.center')}
            value={`${hotspot.center_lat.toFixed(5)}, ${hotspot.center_lng.toFixed(5)}`}
          />
          <View style={styles.divider} />
          <FactRow label={t('detail.lastUpdated')} value={hotspot.last_updated} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t('detail.whyHotspot')}</Text>
          <View style={styles.groupBlock}>
            <Text style={styles.bodyText}>{explanation}</Text>
            <Text style={styles.metaText}>
              {t('detail.linkedTrend', {
                d7: hotspot.recent_7d_count ?? trend.in7d,
                d30: hotspot.recent_30d_count ?? trend.in30d,
              })}
            </Text>
            <Text style={styles.metaText}>
              {t('detail.linkedTotal', { count: linkedAccidents.length })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t('detail.linkedIncidents')}</Text>
          {linkedAccidents.length === 0 ? (
            <Text style={styles.muted}>{t('detail.noLinked')}</Text>
          ) : (
            <View style={styles.group}>
              {linkedAccidents.slice(0, 10).map((item, index) => (
                <View key={item.id ?? item.request_id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <Pressable
                    accessibilityRole={item.id ? 'button' : undefined}
                    accessibilityLabel={
                      item.id ? `${item.severity}, ${item.road_type}` : undefined
                    }
                    disabled={!item.id}
                    onPress={() => {
                      if (item.id) {
                        navigation.navigate('AccidentDetail', { accidentId: item.id });
                      }
                    }}
                    style={({ pressed }) => [
                      styles.incidentRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.incidentBody}>
                      <Text style={styles.incidentTitle}>
                        {item.severity} · {item.road_type}
                      </Text>
                      <Text style={styles.metaText}>
                        {item.created_at ?? item.timestamp}
                      </Text>
                    </View>
                    {item.id ? (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={theme.color.textSecondary}
                      />
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
          )}
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    content: {
      padding: theme.space[4],
      gap: theme.space[4],
    },
    headerWrap: {
      marginBottom: theme.space[1],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    hero: {
      gap: theme.space[1],
      padding: theme.space[5],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    heroValue: {
      fontSize: 40,
      lineHeight: 46,
      fontWeight: '700',
      color: theme.color.primary,
    },
    heroLabel: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    heroMeta: {
      marginTop: theme.space[1],
      fontSize: 15,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    group: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[1],
    },
    groupBlock: {
      gap: theme.space[2],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.color.border,
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
    bodyText: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.color.textPrimary,
    },
    metaText: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    incidentRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[3],
      paddingHorizontal: theme.space[2],
    },
    incidentBody: {
      flex: 1,
      gap: 2,
    },
    incidentTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    pressed: {
      opacity: 0.75,
    },
    card: {
      gap: 6,
    },
    row: {
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
      paddingTop: 8,
      gap: 6,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.color.textPrimary,
    },
    label: {
      fontSize: 11,
      color: theme.color.textSecondary,
    },
    value: {
      fontSize: 12,
      color: theme.color.textPrimary,
    },
    muted: {
      fontSize: 11,
      color: theme.color.textSecondary,
    },
  });
