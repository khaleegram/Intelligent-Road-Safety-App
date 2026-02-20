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
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, HotspotRecord } from '../types';

const DEGREE_WINDOW = 0.02;

export default function HotspotDetailScreen() {
  const { theme } = useTheme();
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
        Alert.alert('Load failed', 'Unable to load hotspot details.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [route.params.hotspotId]);

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
      return `Severity mix - Fatal: ${counts.Fatal ?? 0}, Critical: ${counts.Critical ?? 0}, Minor: ${counts.Minor ?? 0}, Damage Only: ${counts['Damage Only'] ?? 0}.`;
    }
    if (hotspot.risk_score >= 0.8) {
      return 'High risk comes from dense and severe incident clusters in this area.';
    }
    if (hotspot.risk_score >= 0.5) {
      return 'Medium risk comes from repeated incident frequency in nearby roads.';
    }
    return 'Low risk indicates fewer or less severe linked incidents recently.';
  }, [hotspot]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Loading hotspot details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hotspot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Hotspot not found.</Text>
          <Button label="Back" onPress={() => navigation.goBack()} />
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
          { paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow="Details"
            title="Hotspot detail"
            subtitle="Risk explanation and linked incidents"
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
          <Text style={styles.label}>Area ID</Text>
          <Text style={styles.value}>{hotspot.area_id}</Text>
          <Text style={styles.label}>Severity</Text>
          <Text style={styles.value}>{hotspot.severity_level}</Text>
          <Text style={styles.label}>Risk score</Text>
          <Text style={styles.value}>{hotspot.risk_score}</Text>
          <Text style={styles.label}>Center</Text>
          <Text style={styles.value}>
            {hotspot.center_lat.toFixed(5)}, {hotspot.center_lng.toFixed(5)}
          </Text>
          <Text style={styles.label}>Last updated</Text>
          <Text style={styles.value}>{hotspot.last_updated}</Text>
        </IslandCard>

        <IslandCard style={styles.card}>
          <Text style={styles.sectionTitle}>Why this hotspot</Text>
          <Text style={styles.value}>{explanation}</Text>
          <Text style={styles.value}>
            Linked incidents in 7d: {hotspot.recent_7d_count ?? trend.in7d} | in 30d: {hotspot.recent_30d_count ?? trend.in30d}
          </Text>
          <Text style={styles.value}>
            Current total incidents near center: {linkedAccidents.length}
          </Text>
        </IslandCard>

        <IslandCard style={styles.card}>
          <Text style={styles.sectionTitle}>Linked incidents</Text>
          {linkedAccidents.length === 0 ? (
            <Text style={styles.muted}>No linked incidents found in this range.</Text>
          ) : (
            linkedAccidents.slice(0, 10).map((item) => (
              <View key={item.id ?? item.request_id} style={styles.row}>
                <Text style={styles.value}>
                  {item.severity} - {item.road_type}
                </Text>
                <Text style={styles.muted}>{item.created_at ?? item.timestamp}</Text>
                {item.id ? (
                  <Button
                    label="Open incident"
                    variant="secondary"
                    onPress={() => navigation.navigate('AccidentDetail', { accidentId: item.id! })}
                  />
                ) : null}
              </View>
            ))
          )}
        </IslandCard>

        <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
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
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
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
