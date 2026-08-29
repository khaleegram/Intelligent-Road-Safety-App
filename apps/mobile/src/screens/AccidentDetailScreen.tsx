import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
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
            eyebrow={t('detail.accidentEyebrow')}
            title={t('detail.accidentTitle')}
            subtitle={t('detail.accidentSubtitle')}
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
          <Text style={styles.label}>{t('detail.id')}</Text>
          <Text style={styles.value}>{accident.id ?? accident.request_id ?? t('common.none')}</Text>
          <Text style={styles.label}>{t('detail.severity')}</Text>
          <Text style={styles.value}>{accident.severity}</Text>
          <Text style={styles.label}>{t('detail.location')}</Text>
          <Text style={styles.value}>
            {accident.latitude.toFixed(5)}, {accident.longitude.toFixed(5)}
          </Text>
          <Text style={styles.label}>{t('detail.roadWeather')}</Text>
          <Text style={styles.value}>
            {accident.road_type} - {accident.weather}
          </Text>
          <Text style={styles.label}>{t('detail.vehiclesCasualties')}</Text>
          <Text style={styles.value}>
            {accident.vehicle_count} / {accident.casualty_count}
          </Text>
          <Text style={styles.label}>{t('detail.reporter')}</Text>
          <Text style={styles.value}>{accident.reporter_uid ?? t('common.none')}</Text>
          <Text style={styles.label}>{t('detail.submitted')}</Text>
          <Text style={styles.value}>{accident.created_at ?? accident.timestamp}</Text>
        </IslandCard>

        <IslandCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t('detail.verification')}</Text>
          <Text style={styles.value}>
            {t('detail.verified', { value: accident.verified ? t('common.enabled') : t('common.disabled') })}
          </Text>
          <Text style={styles.value}>
            {t('detail.verifiedBy', { value: accident.verified_by ?? t('common.none') })}
          </Text>
          <Text style={styles.value}>
            {t('detail.verifiedAt', { value: accident.verified_at ?? t('common.none') })}
          </Text>
          <Text style={styles.label}>{t('detail.notes')}</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('detail.notesPlaceholder')}
            placeholderTextColor={theme.tokens.color.textSecondary}
            multiline
          />
          <View style={styles.actionRow}>
            <Button
              label={saving ? t('detail.saving') : t('detail.verify')}
              onPress={() => applyVerification(true)}
              disabled={saving}
            />
            <Button
              label={saving ? t('detail.saving') : t('detail.reject')}
              variant="secondary"
              onPress={() => applyVerification(false)}
              disabled={saving}
            />
          </View>
        </IslandCard>

        {relatedHotspot ? (
          <IslandCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t('detail.relatedHotspot')}</Text>
            <Text style={styles.value}>
              {relatedHotspot.severity_level} ({relatedHotspot.accident_count})
            </Text>
            <Button
              label={t('detail.openHotspot')}
              variant="secondary"
              onPress={() =>
                navigation.navigate('HotspotDetail', { hotspotId: relatedHotspot.area_id })
              }
            />
          </IslandCard>
        ) : null}

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
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    input: {
      minHeight: 80,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.surfaceAlt,
      color: theme.colors.text,
      textAlignVertical: 'top',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
  });
