import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Button from '../components/Button';
import FactRow from '../components/FactRow';
import IslandBar from '../components/IslandBar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchAccidentById, fetchHotspots, updateAccidentVerification } from '../services/firestore';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, HotspotRecord } from '../types';

export default function AccidentDetailScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { contentPadding } = useBreakpoint();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AccidentDetail'>>();
  const { isAdmin } = useAdminAccess();
  const [accident, setAccident] = useState<AccidentRecord | null>(null);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [compactBar, setCompactBar] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [accidentData, hotspotData] = await Promise.all([
          fetchAccidentById(route.params.accidentId),
          fetchHotspots(),
        ]);
        if (!mounted) return;
        setAccident(accidentData);
        setHotspots(hotspotData);
        setNotes(accidentData?.notes ?? '');
      } catch (error) {
        console.error(error);
        Alert.alert(t('detail.loadFailedTitle'), t('detail.loadFailedAccident'));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [route.params.accidentId, t]);

  const relatedHotspot = useMemo<HotspotRecord | null>(() => {
    if (!accident || hotspots.length === 0) return null;
    let match: HotspotRecord | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const item of hotspots) {
      const latDiff = item.center_lat - accident.latitude;
      const lngDiff = item.center_lng - accident.longitude;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      if (distance < bestDistance) {
        bestDistance = distance;
        match = item;
      }
    }
    return match;
  }, [accident, hotspots]);

  const applyVerification = async (verified: boolean) => {
    if (!accident?.id) return;
    setSaving(true);
    try {
      await updateAccidentVerification({
        accidentId: accident.id,
        verified,
        notes,
      });
      const refreshed = await fetchAccidentById(accident.id);
      setAccident(refreshed);
      Alert.alert(
        t('detail.savedTitle'),
        verified ? t('detail.verifiedText') : t('detail.rejectedText')
      );
    } catch (error) {
      console.error(error);
      Alert.alert(t('detail.updateFailedTitle'), t('detail.updateFailedText'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>{t('detail.loadingAccident')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!accident) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>{t('detail.accidentNotFound')}</Text>
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
            eyebrow={t('detail.accidentEyebrow')}
            title={t('detail.accidentTitle')}
            subtitle={t('detail.accidentSubtitle')}
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
          <Text style={styles.heroSeverity}>{accident.severity}</Text>
          <Text style={styles.heroTime}>
            {accident.created_at ?? accident.timestamp}
          </Text>
          <Text style={styles.heroLocation}>
            {accident.latitude.toFixed(5)}, {accident.longitude.toFixed(5)}
          </Text>
        </View>

        <View style={styles.group}>
          <FactRow
            label={t('detail.id')}
            value={accident.id ?? accident.request_id ?? t('common.none')}
          />
          <View style={styles.divider} />
          <FactRow
            label={t('detail.roadWeather')}
            value={`${accident.road_type} · ${accident.weather}`}
          />
          <View style={styles.divider} />
          <FactRow
            label={t('detail.vehiclesCasualties')}
            value={`${accident.vehicle_count} / ${accident.casualty_count}`}
          />
          <View style={styles.divider} />
          <FactRow
            label={t('detail.reporter')}
            value={accident.reporter_uid ?? t('common.none')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t('detail.verification')}</Text>
          <View style={styles.group}>
            <FactRow
              label={t('detail.status')}
              value={accident.verified ? t('common.enabled') : t('common.disabled')}
            />
            <View style={styles.divider} />
            <FactRow
              label={t('detail.verifiedByLabel')}
              value={accident.verified_by ?? t('common.none')}
            />
            <View style={styles.divider} />
            <FactRow
              label={t('detail.verifiedAtLabel')}
              value={accident.verified_at ?? t('common.none')}
            />
          </View>

          {isAdmin ? (
            <View style={styles.adminBlock}>
              <Text style={styles.label}>{t('detail.notes')}</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('detail.notesPlaceholder')}
                placeholderTextColor={theme.color.textSecondary}
                multiline
              />
              <View style={styles.actionRow}>
                <Button
                  label={t('detail.verify')}
                  onPress={() => applyVerification(true)}
                  loading={saving}
                  fullWidth
                />
                <Button
                  label={t('detail.reject')}
                  variant="secondary"
                  onPress={() => applyVerification(false)}
                  disabled={saving}
                  fullWidth
                />
              </View>
            </View>
          ) : null}
        </View>

        {relatedHotspot ? (
          <View style={styles.group}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('HotspotDetail', {
                  hotspotId: relatedHotspot.area_id,
                })
              }
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            >
              <View style={styles.linkBody}>
                <Text style={styles.linkTitle}>
                  {relatedHotspot.severity_level} · {relatedHotspot.accident_count}
                </Text>
                <Text style={styles.linkSubtitle}>{t('detail.relatedHotspot')}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.color.textSecondary}
              />
            </Pressable>
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
    hero: {
      gap: theme.space[1],
      padding: theme.space[5],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    heroSeverity: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
      color: theme.color.primary,
    },
    heroTime: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    heroLocation: {
      fontSize: 14,
      color: theme.color.textSecondary,
    },
    group: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[1],
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
    adminBlock: {
      gap: theme.space[2],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    linkRow: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space[2],
    },
    pressed: {
      opacity: 0.75,
    },
    linkBody: {
      flex: 1,
      gap: 2,
    },
    linkTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    linkSubtitle: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    headerWrap: {
      marginBottom: theme.space[2],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    card: {
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
      fontSize: 12,
      color: theme.color.textSecondary,
    },
    input: {
      minHeight: 80,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.color.surfaceElevated,
      color: theme.color.textPrimary,
      textAlignVertical: 'top',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
  });
