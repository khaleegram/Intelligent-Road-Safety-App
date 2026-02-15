import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import Button from '../components/Button';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchAccidentById, fetchHotspots, updateAccidentVerification } from '../services/firestore';
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, HotspotRecord } from '../types';

export default function AccidentDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AccidentDetail'>>();
  const [accident, setAccident] = useState<AccidentRecord | null>(null);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

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
        Alert.alert('Load failed', 'Unable to load accident details.');
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
  }, [route.params.accidentId]);

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
      Alert.alert('Saved', verified ? 'Report verified.' : 'Report rejected.');
    } catch (error) {
      console.error(error);
      Alert.alert('Update failed', 'Unable to update verification status.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Loading accident details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!accident) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Accident not found.</Text>
          <Button label="Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        <Text style={styles.title}>Accident Detail</Text>
        <View style={styles.card}>
          <Text style={styles.label}>ID</Text>
          <Text style={styles.value}>{accident.id ?? accident.request_id ?? '--'}</Text>
          <Text style={styles.label}>Severity</Text>
          <Text style={styles.value}>{accident.severity}</Text>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>
            {accident.latitude.toFixed(5)}, {accident.longitude.toFixed(5)}
          </Text>
          <Text style={styles.label}>Road / Weather</Text>
          <Text style={styles.value}>
            {accident.road_type} - {accident.weather}
          </Text>
          <Text style={styles.label}>Vehicles / Casualties</Text>
          <Text style={styles.value}>
            {accident.vehicle_count} / {accident.casualty_count}
          </Text>
          <Text style={styles.label}>Reporter</Text>
          <Text style={styles.value}>{accident.reporter_uid ?? '--'}</Text>
          <Text style={styles.label}>Submitted</Text>
          <Text style={styles.value}>{accident.created_at ?? accident.timestamp}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Verification</Text>
          <Text style={styles.value}>Verified: {accident.verified ? 'Yes' : 'No'}</Text>
          <Text style={styles.value}>Verified by: {accident.verified_by ?? '--'}</Text>
          <Text style={styles.value}>Verified at: {accident.verified_at ?? '--'}</Text>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add review notes"
            placeholderTextColor={theme.colors.text}
            multiline
          />
          <View style={styles.actionRow}>
            <Button
              label={saving ? 'Saving...' : 'Verify'}
              onPress={() => applyVerification(true)}
              disabled={saving}
            />
            <Button
              label={saving ? 'Saving...' : 'Reject'}
              variant="secondary"
              onPress={() => applyVerification(false)}
              disabled={saving}
            />
          </View>
        </View>

        {relatedHotspot ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Related hotspot</Text>
            <Text style={styles.value}>
              {relatedHotspot.severity_level} ({relatedHotspot.accident_count} accidents)
            </Text>
            <Button
              label="Open hotspot detail"
              variant="secondary"
              onPress={() =>
                navigation.navigate('HotspotDetail', { hotspotId: relatedHotspot.area_id })
              }
            />
          </View>
        ) : null}

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
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    card: {
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
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
