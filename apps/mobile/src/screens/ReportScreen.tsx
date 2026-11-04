import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
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
import IconButton from '../components/IconButton';
import IslandBar from '../components/IslandBar';
import OptionGrid from '../components/OptionGrid';
import AlertBanner from '../components/system/AlertBanner';
import { mapboxToken, missingFirebaseKeys } from '../config/env';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { createAccident } from '../services/firestore';
import { fetchGeocodeSuggestions, type GeocodeSuggestion } from '../services/geocoding';
import { subscribeToConnectivity } from '../services/connectivity';
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
const lightingOptions = ['Daylight', 'Dusk/Dawn', 'Night (lit)', 'Night (unlit)'];
const roadSurfaceOptions = ['Dry', 'Wet', 'Gravel', 'Potholes'];
const trafficDensityOptions = ['Low', 'Medium', 'High'];
const suspectedCauseOptions = ['Speeding', 'Distraction', 'Weather', 'Road condition', 'Other'];
const hasMapboxToken = mapboxToken.length > 0;

export default function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { t } = useI18n();
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
  const [showResearchDetails, setShowResearchDetails] = useState(false);
  const [lightingCondition, setLightingCondition] = useState<string | undefined>();
  const [roadSurface, setRoadSurface] = useState<string | undefined>();
  const [trafficDensity, setTrafficDensity] = useState<string | undefined>();
  const [suspectedCause, setSuspectedCause] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [compactBar, setCompactBar] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return subscribeToConnectivity(setIsOnline);
  }, []);
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

  const missingFields = [
    latitude.trim() && longitude.trim() ? null : t('report.location'),
    roadTypeValue.length > 0 ? null : t('report.roadType'),
    weatherValue.length > 0 ? null : t('report.weather'),
  ]
    .filter(Boolean)
    .join(', ');

  const statusNotice = !isOnline
    ? {
        variant: 'warning' as const,
        title: t('common.offline'),
        message: t('report.offlineBanner'),
      }
    : !hasMapboxToken
      ? {
          variant: 'warning' as const,
          title: t('report.mapboxMissingTitle'),
          message: mapboxNotice,
        }
      : missingFirebaseKeys.length > 0
        ? {
            variant: 'warning' as const,
            title: t('report.firebaseMissingTitle'),
            message: firebaseNoticeText,
          }
        : null;

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
    setFormError(null);
    const validation = validateReportDraft({
      latitude,
      longitude,
      severity,
      roadType: roadTypeValue,
      weather: weatherValue,
      vehicleCount,
      casualtyCount,
      timestamp: editTimestamp ? timestamp : undefined,
      features: {
        lighting_condition: lightingCondition,
        road_surface: roadSurface,
        traffic_density: trafficDensity,
        suspected_cause: suspectedCause,
      },
    });

    if (!validation.ok) {
      setFormError(
        validation.code === 'invalid_location'
          ? {
              title: t('report.invalidLocationTitle'),
              message: t('report.invalidLocationText'),
            }
          : validation.code === 'missing_road_type'
            ? {
                title: t('report.missingFieldTitle'),
                message: t('report.missingRoadTypeText'),
              }
            : validation.code === 'missing_weather'
              ? {
                  title: t('report.missingFieldTitle'),
                  message: t('report.missingWeatherText'),
                }
              : {
                  title: t('report.invalidCountsTitle'),
                  message: t('report.invalidCountsText'),
                }
      );
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
        features: {
          lighting_condition: lightingCondition,
          road_surface: roadSurface,
          traffic_density: trafficDensity,
          suspected_cause: suspectedCause,
        },
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
        stickyHeaderIndices={[0]}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const shouldCompact = event.nativeEvent.contentOffset.y > theme.space[2];
          if (shouldCompact !== compactBar) {
            setCompactBar(shouldCompact);
          }
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.space[8] },
        ]}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow={t('report.eyebrow')}
            title={t('report.title')}
            subtitle={t('report.subtitle')}
            mode="public"
            compact={compactBar}
            isAdmin={isAdmin}
            onToggle={(next) => {
              if (next === 'admin') {
                navigation.navigate('Admin', undefined);
              }
            }}
          />
        </View>
      {syncStatus ? (
        <AlertBanner
          variant="success"
          title={t('report.syncCompleteTitle')}
          message={syncStatus}
        />
      ) : statusNotice ? (
        <AlertBanner
          variant={statusNotice.variant}
          title={statusNotice.title}
          message={statusNotice.message}
        />
      ) : null}

      {hasMapboxToken ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t('report.searchTitle')}</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('report.searchPlaceholder')}
              value={locationQuery}
              onChangeText={setLocationQuery}
              placeholderTextColor={theme.color.textSecondary}
            />
            <IconButton
              icon={<Ionicons name="locate" size={20} color={theme.color.textPrimary} />}
              accessibilityLabel={t('report.useCurrentLocation')}
              variant="solid"
              disabled={!userLocation}
              onPress={useCurrentLocation}
            />
          </View>
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
          <View style={styles.mapPreview}>
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
          </View>
          <Text style={styles.mapHint}>{t('report.mapHint')}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
      <Text style={styles.sectionHeading}>{t('report.sectionLocation')}</Text>
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
        <View style={styles.coordinateItem}>
          <Text style={styles.coordinateLabel}>{t('report.lat')}</Text>
          <Text style={styles.coordinateValue}>
            {latitude.trim().length > 0 ? latitude : t('common.none')}
          </Text>
        </View>
        <View style={styles.coordinateDivider} />
        <View style={styles.coordinateItem}>
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
            placeholderTextColor={theme.color.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder={t('map.routeLngPlaceholder')}
            value={longitude}
            onChangeText={setLongitude}
            keyboardType="numeric"
            placeholderTextColor={theme.color.textSecondary}
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
          placeholderTextColor={theme.color.textSecondary}
        />
      ) : null}
      </View>

      <View style={styles.section}>
      <Text style={styles.sectionHeading}>{t('report.incidentDetails')}</Text>
      <Text style={styles.label}>{t('report.severity')}</Text>
      <OptionGrid
        columns={2}
        accessibilityLabel={t('report.severity')}
        value={severity}
        onChange={(value) => setSeverity(value as AccidentSeverity)}
        options={severityOptions.map((option) => ({
          value: option,
          label: t(`options.severity.${option}`),
        }))}
      />

      <Text style={styles.label}>{t('report.roadType')}</Text>
      <OptionGrid
        columns={3}
        accessibilityLabel={t('report.roadType')}
        value={roadTypePreset}
        onChange={(value) => {
          setRoadTypePreset(value);
          if (value !== 'Other') {
            setRoadTypeCustom('');
          }
        }}
        options={roadTypeOptions.map((option) => ({
          value: option,
          label: t(`options.roadType.${option}`),
        }))}
      />
      {roadTypePreset === 'Other' ? (
        <TextInput
          style={styles.input}
          placeholder={t('report.describeRoadType')}
          value={roadTypeCustom}
          onChangeText={setRoadTypeCustom}
          placeholderTextColor={theme.color.textSecondary}
        />
      ) : null}
      <Text style={styles.label}>{t('report.weather')}</Text>
      <OptionGrid
        columns={3}
        accessibilityLabel={t('report.weather')}
        value={weatherPreset}
        onChange={(value) => {
          setWeatherPreset(value);
          if (value !== 'Other') {
            setWeatherCustom('');
          }
        }}
        options={weatherOptions.map((option) => ({
          value: option,
          label: t(`options.weather.${option}`),
        }))}
      />
      {weatherPreset === 'Other' ? (
        <TextInput
          style={styles.input}
          placeholder={t('report.describeWeather')}
          value={weatherCustom}
          onChangeText={setWeatherCustom}
          placeholderTextColor={theme.color.textSecondary}
        />
      ) : null}
      <Text style={styles.label}>{t('report.counts')}</Text>
      <View style={styles.counterRow}>
        <Text style={styles.counterLabel}>{t('report.vehicles')}</Text>
        <View style={styles.counterControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('report.decrease', { label: t('report.vehicles') })}
            accessibilityState={{ disabled: vehicleCount === 0 }}
            disabled={vehicleCount === 0}
            style={[styles.counterButton, vehicleCount === 0 && styles.counterButtonDisabled]}
            onPress={() => setVehicleCount((value) => Math.max(0, value - 1))}
          >
            <Ionicons name="remove" size={20} color={theme.color.textPrimary} />
          </Pressable>
          <Text style={styles.counterValue}>{vehicleCount}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('report.increase', { label: t('report.vehicles') })}
            style={styles.counterButton}
            onPress={() => setVehicleCount((value) => value + 1)}
          >
            <Ionicons name="add" size={20} color={theme.color.textPrimary} />
          </Pressable>
        </View>
      </View>
      <View style={styles.counterRow}>
        <Text style={styles.counterLabel}>{t('report.casualties')}</Text>
        <View style={styles.counterControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('report.decrease', { label: t('report.casualties') })}
            accessibilityState={{ disabled: casualtyCount === 0 }}
            disabled={casualtyCount === 0}
            style={[styles.counterButton, casualtyCount === 0 && styles.counterButtonDisabled]}
            onPress={() => setCasualtyCount((value) => Math.max(0, value - 1))}
          >
            <Ionicons name="remove" size={20} color={theme.color.textPrimary} />
          </Pressable>
          <Text style={styles.counterValue}>{casualtyCount}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('report.increase', { label: t('report.casualties') })}
            style={styles.counterButton}
            onPress={() => setCasualtyCount((value) => value + 1)}
          >
            <Ionicons name="add" size={20} color={theme.color.textPrimary} />
          </Pressable>
        </View>
      </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={styles.inlineHeader}
          onPress={() => setShowResearchDetails((prev) => !prev)}
        >
          <Text style={styles.sectionHeading}>{t('report.researchDetails')}</Text>
          <Text style={styles.inlineActionText}>
            {showResearchDetails ? t('common.close') : t('report.edit')}
          </Text>
        </Pressable>
        <Text style={styles.inlineHint}>{t('report.researchDetailsHint')}</Text>
        {showResearchDetails ? (
          <>
            <Text style={styles.label}>{t('report.lighting')}</Text>
            <OptionGrid
              columns={3}
              accessibilityLabel={t('report.lighting')}
              value={lightingCondition}
              onChange={(value) =>
                setLightingCondition((prev) => (prev === value ? undefined : value))
              }
              options={lightingOptions.map((option) => ({ value: option, label: option }))}
            />
            <Text style={styles.label}>{t('report.roadSurface')}</Text>
            <OptionGrid
              columns={3}
              accessibilityLabel={t('report.roadSurface')}
              value={roadSurface}
              onChange={(value) =>
                setRoadSurface((prev) => (prev === value ? undefined : value))
              }
              options={roadSurfaceOptions.map((option) => ({ value: option, label: option }))}
            />
            <Text style={styles.label}>{t('report.trafficDensity')}</Text>
            <OptionGrid
              columns={3}
              accessibilityLabel={t('report.trafficDensity')}
              value={trafficDensity}
              onChange={(value) =>
                setTrafficDensity((prev) => (prev === value ? undefined : value))
              }
              options={trafficDensityOptions.map((option) => ({ value: option, label: option }))}
            />
            <Text style={styles.label}>{t('report.suspectedCause')}</Text>
            <OptionGrid
              columns={3}
              accessibilityLabel={t('report.suspectedCause')}
              value={suspectedCause}
              onChange={(value) =>
                setSuspectedCause((prev) => (prev === value ? undefined : value))
              }
              options={suspectedCauseOptions.map((option) => ({ value: option, label: option }))}
            />
          </>
        ) : null}
      </View>

      </ScrollView>
      <View style={styles.footer}>
        {formError ? (
          <AlertBanner
            variant="error"
            title={formError.title}
            message={formError.message}
          />
        ) : null}
        {!canSubmit && !submitting && missingFields ? (
          <Text style={styles.footerHint}>
            {t('report.completeFields', { fields: missingFields })}
          </Text>
        ) : null}
        <Button
          label={t('report.submit')}
          onPress={submit}
          loading={submitting}
          disabled={!canSubmit}
          fullWidth
        />
      </View>
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
    padding: theme.space[5],
    gap: theme.space[4],
  },
  footer: {
    paddingHorizontal: theme.space[5],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[4],
    gap: theme.space[2],
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  footerHint: {
    fontSize: theme.type.caption.fontSize,
    lineHeight: theme.type.caption.lineHeight,
    color: theme.color.textSecondary,
  },
  headerWrap: {
    marginBottom: theme.space[2],
    backgroundColor: theme.color.background,
    paddingBottom: theme.space[2],
  },
  formIsland: {
    gap: theme.space[2],
  },
  inlineHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space[2],
  },
  inlineTitle: {
    fontSize: theme.type.label.fontSize,
    fontWeight: theme.type.label.fontWeight,
    color: theme.color.textSecondary,
  },
  inlineAction: {
    minHeight: 44,
    paddingHorizontal: theme.space[1],
    justifyContent: 'center',
  },
  inlineActionText: {
    fontSize: theme.type.label.fontSize,
    fontWeight: theme.type.label.fontWeight,
    color: theme.color.primary,
  },
  inlineHint: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  coordinateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
  },
  coordinateItem: {
    flex: 1,
  },
  coordinateDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.color.border,
  },
  coordinateLabel: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  coordinateValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.textPrimary,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
    color: theme.color.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: theme.color.textPrimary,
    marginTop: theme.space[1],
    marginBottom: theme.space[2],
  },
  banner: {
    marginBottom: theme.space[3],
    padding: theme.space[3],
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
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    marginBottom: theme.space[3],
    backgroundColor: theme.color.surfaceElevated,
    color: theme.color.textPrimary,
    fontSize: theme.type.body.fontSize,
  },
  mapCard: {
    marginBottom: theme.space[4],
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    padding: 0,
  },
  searchCard: {
    marginBottom: theme.space[4],
    gap: theme.space[4],
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    fontSize: theme.type.body.fontSize,
    backgroundColor: theme.color.surface,
    color: theme.color.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
  },
  searchHint: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  quickRow: {
    marginTop: theme.space[2],
  },
  map: {
    height: 170,
  },
  mapPreview: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  mapHint: {
    fontSize: theme.type.caption.fontSize,
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
  label: {
    fontSize: theme.type.label.fontSize,
    lineHeight: theme.type.label.lineHeight,
    fontWeight: theme.type.label.fontWeight,
    color: theme.color.textPrimary,
    marginTop: theme.space[3],
    marginBottom: theme.space[2],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[3],
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  counterLabel: {
    fontSize: 14,
    color: theme.color.textPrimary,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceElevated,
  },
  counterButtonDisabled: {
    opacity: 0.4,
  },
  counterButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.color.textPrimary,
  },
  counterValue: {
    fontSize: theme.type.heading.fontSize,
    fontWeight: theme.type.heading.fontWeight,
    color: theme.color.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  chip: {
    flexGrow: 0,
  },
  suggestionList: {
    marginTop: theme.space[1],
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.color.surface,
  },
  suggestionItem: {
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.textPrimary,
  },
  suggestionSubtitle: {
    marginTop: 2,
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  actions: {
    marginTop: theme.space[4],
    gap: theme.space[3],
  },
  });
