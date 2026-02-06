import MapboxGL from '@rnmapbox/maps';
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight, type BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { mapboxToken, missingFirebaseKeys } from '../config/env';
import type { RootTabParamList } from '../navigation/RootNavigator';
import { createAccident } from '../services/firestore';
import { fetchGeocodeSuggestions, type GeocodeSuggestion } from '../services/geocoding';
import { offlineQueue } from '../services/offlineQueue';
import { type Theme, useTheme } from '../theme';
import type { AccidentSeverity, AccidentRecord } from '../types';

const severityOptions: AccidentSeverity[] = [
  'Fatal',
  'Critical',
  'Minor',
  'Damage Only',
];
const hasMapboxToken = mapboxToken.length > 0;
const mapboxTokenNotice =
  'Mapbox token missing. Set EXPO_PUBLIC_MAPBOX_TOKEN in apps/mobile/.env and rebuild the dev client.';
const firebaseNotice =
  missingFirebaseKeys.length > 0
    ? `Firebase config missing: ${missingFirebaseKeys.join(', ')}. Update apps/mobile/.env and restart.`
    : '';

export default function ReportScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = createStyles(theme);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [timestamp, setTimestamp] = useState('');
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
  const [roadType, setRoadType] = useState('');
  const [weather, setWeather] = useState('');
  const [vehicleCount, setVehicleCount] = useState('');
  const [casualtyCount, setCasualtyCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const canSubmit =
    latitude.trim().length > 0 &&
    longitude.trim().length > 0 &&
    roadType.trim().length > 0 &&
    weather.trim().length > 0 &&
    vehicleCount.trim().length > 0 &&
    casualtyCount.trim().length > 0 &&
    !submitting;

  useEffect(() => {
    if (hasMapboxToken) {
      MapboxGL.setAccessToken(mapboxToken);
    }
  }, []);


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
            setSyncStatus(`Synced ${result.synced} queued report(s).`);
          }
        });
      }
    });

    return () => subscription.remove();
  }, []);

  const handleMapPress = (event: MapboxGL.OnPressEvent) => {
    const coords = event.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    setSelectedCoordinate([lng, lat]);
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  };

  const handleLocationSuggestion = (suggestion: GeocodeSuggestion) => {
    setSelectedCoordinate(suggestion.center);
    setLatitude(suggestion.center[1].toFixed(6));
    setLongitude(suggestion.center[0].toFixed(6));
    setLocationQuery(suggestion.place_name);
    setLocationSuggestions([]);
  };

  const useCurrentLocation = () => {
    if (!userLocation) return;
    setSelectedCoordinate(userLocation);
    setLatitude(userLocation[1].toFixed(6));
    setLongitude(userLocation[0].toFixed(6));
  };

  const submit = async () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const vehicles = Number(vehicleCount);
    const casualties = Number(casualtyCount);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Invalid location', 'Latitude and longitude must be numbers.');
      return;
    }

    if (!roadType.trim()) {
      Alert.alert('Missing field', 'Road type is required.');
      return;
    }

    if (!weather.trim()) {
      Alert.alert('Missing field', 'Weather condition is required.');
      return;
    }

    if (Number.isNaN(vehicles) || Number.isNaN(casualties)) {
      Alert.alert('Invalid counts', 'Vehicle and casualty counts must be numbers.');
      return;
    }

    const record: AccidentRecord = {
      latitude: lat,
      longitude: lng,
      timestamp: timestamp.trim() || new Date().toISOString(),
      severity,
      road_type: roadType.trim(),
      weather: weather.trim(),
      vehicle_count: vehicles,
      casualty_count: casualties,
      created_at: new Date().toISOString(),
    };

    try {
      setSubmitting(true);
      await createAccident(record);
      Alert.alert('Submitted', 'Accident report saved.');
      setLatitude('');
      setLongitude('');
      setTimestamp('');
      setSeverity('Minor');
      setRoadType('');
      setWeather('');
      setVehicleCount('');
      setCasualtyCount('');
    } catch (error) {
      await offlineQueue.enqueue(record);
      Alert.alert(
        'Queued offline',
        'No connection. Your report was saved and will sync automatically.'
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
          <ScreenHeader
            eyebrow="Report"
            title="Report Incident"
            subtitle="Provide details to help build safer roads."
          />
      {!hasMapboxToken ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Mapbox not configured</Text>
          <Text style={styles.bannerText}>{mapboxTokenNotice}</Text>
        </View>
      ) : null}
      {missingFirebaseKeys.length > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Firebase not configured</Text>
          <Text style={styles.bannerText}>{firebaseNotice}</Text>
        </View>
      ) : null}
      {syncStatus ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Sync complete</Text>
          <Text style={styles.bannerText}>{syncStatus}</Text>
        </View>
      ) : null}

      {hasMapboxToken ? (
        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>Search location</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search a place (e.g., Garki Area 1)"
            value={locationQuery}
            onChangeText={setLocationQuery}
            placeholderTextColor={theme.colors.textSoft}
          />
          {locationSearching ? (
            <Text style={styles.searchHint}>Searching locations...</Text>
          ) : null}
          {locationSuggestions.length > 0 ? (
            <View style={styles.suggestionList}>
              {locationSuggestions.map((item) => (
                <Pressable
                  key={item.id}
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
              label="Use current location"
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
              />
            ) : null}
          </MapboxGL.MapView>
          <Text style={styles.mapHint}>Tap the map to set the incident location.</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Latitude"
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numeric"
        placeholderTextColor={theme.colors.textSoft}
      />
      <TextInput
        style={styles.input}
        placeholder="Longitude"
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numeric"
        placeholderTextColor={theme.colors.textSoft}
      />
      <TextInput
        style={styles.input}
        placeholder="Timestamp (ISO, optional)"
        value={timestamp}
        onChangeText={setTimestamp}
        placeholderTextColor={theme.colors.textSoft}
      />

      <Text style={styles.sectionTitle}>Incident details</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Severity</Text>
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
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Road type"
        value={roadType}
        onChangeText={setRoadType}
        placeholderTextColor={theme.colors.textSoft}
      />
      <TextInput
        style={styles.input}
        placeholder="Weather condition"
        value={weather}
        onChangeText={setWeather}
        placeholderTextColor={theme.colors.textSoft}
      />
      <Text style={styles.sectionTitle}>Counts</Text>
      <TextInput
        style={styles.input}
        placeholder="Number of vehicles"
        value={vehicleCount}
        onChangeText={setVehicleCount}
        keyboardType="numeric"
        placeholderTextColor={theme.colors.textSoft}
      />
      <TextInput
        style={styles.input}
        placeholder="Number of casualties"
        value={casualtyCount}
        onChangeText={setCasualtyCount}
        keyboardType="numeric"
        placeholderTextColor={theme.colors.textSoft}
      />

      {submitting ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.loadingText}>Submitting...</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label="Submit report" onPress={submit} disabled={!canSubmit} />
        <Button
          label="Back to map"
          variant="secondary"
          onPress={() => navigation.navigate('Map')}
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
