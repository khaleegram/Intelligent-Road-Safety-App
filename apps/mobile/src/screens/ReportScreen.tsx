import MapboxGL from '@rnmapbox/maps';
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { mapboxToken, missingFirebaseKeys } from '../config/env';
import type { RootTabParamList } from '../navigation/RootNavigator';
import { createAccident } from '../services/firestore';
import { offlineQueue } from '../services/offlineQueue';
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
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [selectedCoordinate, setSelectedCoordinate] = useState<[number, number] | null>(
    null
  );
  const [severity, setSeverity] = useState<AccidentSeverity>('Minor');
  const [roadType, setRoadType] = useState('');
  const [weather, setWeather] = useState('');
  const [vehicleCount, setVehicleCount] = useState('');
  const [casualtyCount, setCasualtyCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (hasMapboxToken) {
      MapboxGL.setAccessToken(mapboxToken);
    }
  }, []);

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
      <ScreenHeader
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
        <View style={styles.mapCard}>
          <MapboxGL.MapView style={styles.map} onPress={handleMapPress}>
            <MapboxGL.Camera
              zoomLevel={selectedCoordinate ? 15 : 11}
              centerCoordinate={selectedCoordinate ?? [3.3792, 6.5244]}
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

      <TextInput
        style={styles.input}
        placeholder="Latitude"
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Longitude"
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Timestamp (ISO, optional)"
        value={timestamp}
        onChangeText={setTimestamp}
      />

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
      />
      <TextInput
        style={styles.input}
        placeholder="Weather condition"
        value={weather}
        onChangeText={setWeather}
      />
      <TextInput
        style={styles.input}
        placeholder="Number of vehicles"
        value={vehicleCount}
        onChangeText={setVehicleCount}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Number of casualties"
        value={casualtyCount}
        onChangeText={setCasualtyCount}
        keyboardType="numeric"
      />

      {submitting ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#111" />
          <Text style={styles.loadingText}>Submitting...</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label="Submit report" onPress={submit} disabled={submitting} />
        <Button
          label="Back to map"
          variant="secondary"
          onPress={() => navigation.navigate('Map')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#333',
  },
  banner: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeeba',
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#856404',
  },
  bannerText: {
    marginTop: 4,
    fontSize: 11,
    color: '#856404',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  mapCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  map: {
    height: 180,
  },
  mapHint: {
    padding: 10,
    fontSize: 12,
    color: '#555',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f5f5f5',
  },
  chipSelected: {
    borderColor: '#111',
    backgroundColor: '#111',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
});
