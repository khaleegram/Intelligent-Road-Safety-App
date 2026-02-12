import MapboxGL from '@rnmapbox/maps';
import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import { mapboxToken, missingFirebaseKeys } from '../config/env';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { createAccident } from '../services/firestore';
import { fetchGeocodeSuggestions, type GeocodeSuggestion } from '../services/geocoding';
import { offlineQueue } from '../services/offlineQueue';
import { buildAccidentRecord, validateReportDraft } from '../services/reportValidation';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import type { AccidentSeverity } from '../types';

const severityOptions: AccidentSeverity[] = [
  'Fatal',
  'Critical',
  'Minor',
  'Damage Only',
];
const roadTypeOptions = ['Urban', 'Highway', 'Residential', 'Rural', 'Intersection', 'Other'];
const weatherOptions = ['Clear', 'Rain', 'Fog', 'Night', 'Harmattan', 'Other'];
const hasMapboxToken = mapboxToken.length > 0;

export default function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = createStyles(theme);
  const { isAdmin } = useAdminAccess();
  const mapboxNotice = t('report.mapboxMissingText');
  const firebaseNoticeText =
    missingFirebaseKeys.length > 0
      ? t('report.firebaseMissingText', { keys: missingFirebaseKeys.join(', ') })
      : '';
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [editCoordinates, setEditCoordinates] = useState(false);
  const [editTimestamp, setEditTimestamp] = useState(false);
  const [selectedCoordinate, setSelectedCoordinate] = useState<[number, number] | null>(
    null
  );
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<GeocodeSuggestion[]>(
    []
  );
  const [locationSearching, setLocationSearching] = useState(false);
  const [severity, setSeverity] = useState<AccidentSeverity>('Minor');
  const [roadTypePreset, setRoadTypePreset] = useState('Urban');
  const [roadTypeCustom, setRoadTypeCustom] = useState('');
  const [weatherPreset, setWeatherPreset] = useState('Clear');
  const [weatherCustom, setWeatherCustom] = useState('');
  const [vehicleCount, setVehicleCount] = useState(1);
  const [casualtyCount, setCasualtyCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const roadTypeValue = useMemo(
    () => (roadTypePreset === 'Other' ? roadTypeCustom.trim() : roadTypePreset),
    [roadTypeCustom, roadTypePreset]
  );
  const weatherValue = useMemo(
    () => (weatherPreset === 'Other' ? weatherCustom.trim() : weatherPreset),
    [weatherCustom, weatherPreset]
  );
  const canSubmit =
    latitude.trim().length > 0 &&
    longitude.trim().length > 0 &&
    roadTypeValue.length > 0 &&
    weatherValue.length > 0 &&
    !submitting;

  useEffect(() => {
    if (hasMapboxToken) {
      MapboxGL.setAccessToken(mapboxToken);
    }
  }, [t]);


  useEffect(() => {
    if (!hasMapboxToken) return;
    if (locationQuery.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const handle = setTimeout(() => {
      setLocationSearching(true);
      fetchGeocodeSuggestions(
        locationQuery,
        mapboxToken,
        5,
        userLocation ?? undefined,
        'ng',
        [2.676932, 4.1821, 14.678014, 13.885645]
      )
        .then((results) => setLocationSuggestions(results))
        .catch(() => setLocationSuggestions([]))
        .finally(() => setLocationSearching(false));
    }, 350);

    return () => clearTimeout(handle);
  }, [locationQuery]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        offlineQueue.sync().then((result) => {
          if (result.synced > 0) {
            setSyncStatus(
              t('report.syncedStatus', { count: result.synced })
            );
          }
        });
      }
    });

    return () => subscription.remove();
  }, []);

  const handleMapPress = (event: any) => {
    const coords = event.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    setSelectedCoordinate([lng, lat]);
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    setEditCoordinates(false);
  };

  const handleLocationSuggestion = (suggestion: GeocodeSuggestion) => {
    setSelectedCoordinate(suggestion.center);
    setLatitude(suggestion.center[1].toFixed(6));
    setLongitude(suggestion.center[0].toFixed(6));
    setLocationQuery(suggestion.place_name);
    setLocationSuggestions([]);
    setEditCoordinates(false);
  };

  const useCurrentLocation = () => {
    if (!userLocation) return;
    setSelectedCoordinate(userLocation);
    setLatitude(userLocation[1].toFixed(6));
    setLongitude(userLocation[0].toFixed(6));
    setEditCoordinates(false);
  };

  const submit = async () => {
    const validation = validateReportDraft({
      latitude,
      longitude,
      severity,
      roadType: roadTypeValue,
      weather: weatherValue,
      vehicleCount,
      casualtyCount,
      timestamp: editTimestamp ? timestamp : undefined,
    });

    if (!validation.ok) {
      if (validation.code === 'invalid_location') {
        Alert.alert(t('report.invalidLocationTitle'), t('report.invalidLocationText'));
        return;
      }
      if (validation.code === 'missing_road_type') {
        Alert.alert(t('report.missingFieldTitle'), t('report.missingRoadTypeText'));
        return;
      }
      if (validation.code === 'missing_weather') {
        Alert.alert(t('report.missingFieldTitle'), t('report.missingWeatherText'));
        return;
      }
      Alert.alert(t('report.invalidCountsTitle'), t('report.invalidCountsText'));
      return;
    }

    const nowIso = new Date().toISOString();
    const record = buildAccidentRecord(
      {
        latitude,
        longitude,
        severity,
        roadType: roadTypeValue,
        weather: weatherValue,
        vehicleCount,
        casualtyCount,
        timestamp: editTimestamp ? timestamp : undefined,
      },
      nowIso
    );

    try {
      setSubmitting(true);
      await createAccident(record);
      Alert.alert(t('report.submittedTitle'), t('report.submittedText'));
      setLatitude('');
      setLongitude('');
      setTimestamp('');
      setEditTimestamp(false);
      setSeverity('Minor');
      setRoadTypePreset('Urban');
      setRoadTypeCustom('');
      setWeatherPreset('Clear');
      setWeatherCustom('');
      setVehicleCount(1);
      setCasualtyCount(0);
    } catch (error) {
      await offlineQueue.enqueue(record);
      Alert.alert(
        t('report.queuedTitle'),
        t('report.queuedText')
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.lg + tabBarHeight },
        ]}
      >
        <IslandBar
          eyebrow={t('report.eyebrow')}
          title={t('report.title')}
          subtitle={t('report.subtitle')}
          mode="public"
          isAdmin={isAdmin}
          onToggle={(next) => {
            if (next === 'admin') {
              navigation.navigate('Admin', undefined);
            }
          }}
        />
      {!hasMapboxToken ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{t('report.mapboxMissingTitle')}</Text>
          <Text style={styles.bannerText}>{mapboxNotice}</Text>
        </View>
      ) : null}
      {missingFirebaseKeys.length > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{t('report.firebaseMissingTitle')}</Text>
          <Text style={styles.bannerText}>{firebaseNoticeText}</Text>
        </View>
      ) : null}
      {syncStatus ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{t('report.syncCompleteTitle')}</Text>
          <Text style={styles.bannerText}>{syncStatus}</Text>
        </View>
      ) : null}

      {hasMapboxToken ? (
        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>{t('report.searchTitle')}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('report.searchPlaceholder')}
            value={locationQuery}
            onChangeText={setLocationQuery}
            placeholderTextColor={theme.colors.textSoft}
          />
          {locationSearching ? (
            <Text style={styles.searchHint}>{t('report.searching')}</Text>
          ) : null}
          {locationSuggestions.length > 0 ? (
            <View style={styles.suggestionList}>
              {locationSuggestions.map((item, index) => (
                <Pressable
                  key={`${item.id}-${index}`}
                  onPress={() => handleLocationSuggestion(item)}
                  style={styles.suggestionItem}
                >
                  <Text style={styles.suggestionTitle}>{item.name}</Text>
                  <Text style={styles.suggestionSubtitle}>{item.place_name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.quickRow}>
            <Button
              label={t('report.useCurrentLocation')}
              variant="secondary"
              onPress={useCurrentLocation}
              disabled={!userLocation}
              fullWidth
            />
          </View>
        </View>
      ) : null}

      {hasMapboxToken ? (
        <View style={styles.mapCard}>
          <MapboxGL.MapView style={styles.map} onPress={handleMapPress}>
            <MapboxGL.Camera
              zoomLevel={selectedCoordinate ? 15 : 11}
              centerCoordinate={selectedCoordinate ?? [8.6753, 9.082]}
              minZoomLevel={5}
              maxBounds={{
                ne: [14.678014, 13.885645],
                sw: [2.676932, 4.1821],
              }}
            />
            <MapboxGL.UserLocation
              visible
              onUpdate={(location) => {
                const { longitude, latitude } = location.coords;
                if (typeof longitude === 'number' && typeof latitude === 'number') {
                  setUserLocation([longitude, latitude]);
                }
              }}
            />
          {selectedCoordinate ? (
            <MapboxGL.PointAnnotation
              id="selected-location"
              coordinate={selectedCoordinate}
            >
              <View />
            </MapboxGL.PointAnnotation>
          ) : null}
        </MapboxGL.MapView>
        <Text style={styles.mapHint}>{t('report.mapHint')}</Text>
      </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t('report.sectionLocation')}</Text>
      <View style={styles.inlineHeader}>
        <Text style={styles.inlineTitle}>{t('report.coordinates')}</Text>
        <Pressable
          style={styles.inlineAction}
          onPress={() => setEditCoordinates((prev) => !prev)}
        >
          <Text style={styles.inlineActionText}>
            {editCoordinates ? t('report.lock') : t('report.edit')}
          </Text>
        </Pressable>
      </View>
      <View style={styles.coordinateRow}>
        <View style={styles.coordinatePill}>
          <Text style={styles.coordinateLabel}>{t('report.lat')}</Text>
          <Text style={styles.coordinateValue}>
            {latitude.trim().length > 0 ? latitude : t('common.none')}
          </Text>
        </View>
        <View style={styles.coordinatePill}>
          <Text style={styles.coordinateLabel}>{t('report.lng')}</Text>
          <Text style={styles.coordinateValue}>
            {longitude.trim().length > 0 ? longitude : t('common.none')}
          </Text>
        </View>
      </View>
      {editCoordinates ? (
        <>
          <TextInput
            style={styles.input}
            placeholder={t('map.routeLatPlaceholder')}
            value={latitude}
            onChangeText={setLatitude}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textSoft}
          />
          <TextInput
            style={styles.input}
            placeholder={t('map.routeLngPlaceholder')}
            value={longitude}
            onChangeText={setLongitude}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textSoft}
          />
        </>
      ) : null}
      <View style={styles.inlineHeader}>
        <Text style={styles.inlineTitle}>{t('report.timeOfIncident')}</Text>
        <Pressable
          style={styles.inlineAction}
          onPress={() => setEditTimestamp((prev) => !prev)}
        >
          <Text style={styles.inlineActionText}>
            {editTimestamp ? t('report.useNow') : t('report.setTime')}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.inlineHint}>
        {editTimestamp && timestamp.trim().length > 0
          ? timestamp.trim()
          : t('report.useNow')}
      </Text>
      {editTimestamp ? (
        <TextInput
          style={styles.input}
          placeholder={t('report.timestampPlaceholder')}
          value={timestamp}
          onChangeText={setTimestamp}
          placeholderTextColor={theme.colors.textSoft}
        />
      ) : null}

      <Text style={styles.sectionTitle}>{t('report.incidentDetails')}</Text>
      <View style={styles.section}>
        <Text style={styles.label}>{t('report.severity')}</Text>
        <View style={styles.row}>
          {severityOptions.map((option) => (
            <Pressable
              key={option}
              style={[
                styles.chip,
                severity === option && styles.chipSelected,
              ]}
              onPress={() => setSeverity(option)}
            >
              <Text
                style={[
                  styles.chipText,
                  severity === option && styles.chipTextSelected,
                ]}
              >
                {t(`options.severity.${option}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('report.roadType')}</Text>
      <View style={styles.row}>
        {roadTypeOptions.map((option) => (
          <Pressable
            key={option}
            style={[
              styles.chip,
              roadTypePreset === option && styles.chipSelected,
            ]}
            onPress={() => {
              setRoadTypePreset(option);
              if (option !== 'Other') {
                setRoadTypeCustom('');
              }
            }}
          >
            <Text
              style={[
                styles.chipText,
                roadTypePreset === option && styles.chipTextSelected,
              ]}
            >
              {t(`options.roadType.${option}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {roadTypePreset === 'Other' ? (
        <TextInput
          style={styles.input}
          placeholder={t('report.describeRoadType')}
          value={roadTypeCustom}
          onChangeText={setRoadTypeCustom}
          placeholderTextColor={theme.colors.textSoft}
        />
      ) : null}
      <Text style={styles.sectionTitle}>{t('report.weather')}</Text>
      <View style={styles.row}>
        {weatherOptions.map((option) => (
          <Pressable
            key={option}
            style={[
              styles.chip,
              weatherPreset === option && styles.chipSelected,
            ]}
            onPress={() => {
              setWeatherPreset(option);
              if (option !== 'Other') {
                setWeatherCustom('');
              }
            }}
          >
            <Text
              style={[
                styles.chipText,
                weatherPreset === option && styles.chipTextSelected,
              ]}
            >
              {t(`options.weather.${option}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {weatherPreset === 'Other' ? (
        <TextInput
          style={styles.input}
          placeholder={t('report.describeWeather')}
          value={weatherCustom}
          onChangeText={setWeatherCustom}
          placeholderTextColor={theme.colors.textSoft}
        />
      ) : null}
      <Text style={styles.sectionTitle}>{t('report.counts')}</Text>
      <View style={styles.counterRow}>
        <Text style={styles.counterLabel}>{t('report.vehicles')}</Text>
        <View style={styles.counterControls}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setVehicleCount((value) => Math.max(0, value - 1))}
          >
            <Text style={styles.counterButtonText}>-</Text>
          </Pressable>
          <Text style={styles.counterValue}>{vehicleCount}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setVehicleCount((value) => value + 1)}
          >
            <Text style={styles.counterButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.counterRow}>
        <Text style={styles.counterLabel}>{t('report.casualties')}</Text>
        <View style={styles.counterControls}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setCasualtyCount((value) => Math.max(0, value - 1))}
          >
            <Text style={styles.counterButtonText}>-</Text>
          </Pressable>
          <Text style={styles.counterValue}>{casualtyCount}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setCasualtyCount((value) => value + 1)}
          >
            <Text style={styles.counterButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {submitting ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.loadingText}>{t('report.submitting')}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('report.submit')} onPress={submit} disabled={!canSubmit} />
        <Button
          label={t('common.backToMap')}
          variant="secondary"
          onPress={() => navigation.navigate('Public', { screen: 'Map' })}
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
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  inlineTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inlineAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  inlineActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inlineHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  coordinatePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  coordinateLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  coordinateValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  banner: {
    marginBottom: 12,
    padding: 10,
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
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  mapCard: {
    marginBottom: 16,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchCard: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  searchHint: {
    marginTop: theme.spacing.sm,
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  quickRow: {
    marginTop: theme.spacing.sm,
  },
  map: {
    height: 200,
  },
  mapHint: {
    padding: 10,
    fontSize: 12,
    color: theme.colors.textMuted,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  counterLabel: {
    fontSize: 12,
    color: theme.colors.text,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  counterButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  counterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
  },
  chipSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  chipTextSelected: {
    color: '#fff',
  },
  suggestionList: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  suggestionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  actions: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  });
