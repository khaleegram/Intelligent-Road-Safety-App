import MapboxGL from '@rnmapbox/maps';
import type { CameraRef } from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { mapboxToken, missingFirebaseKeys } from '../config/env';
import type { RootTabParamList } from '../navigation/RootNavigator';
import { fetchHotspots } from '../services/firestore';
import type { HotspotRecord } from '../types';

const hasMapboxToken = mapboxToken.length > 0;
const mapboxTokenNotice =
  'Mapbox token missing. Set EXPO_PUBLIC_MAPBOX_TOKEN in apps/mobile/.env and rebuild the dev client.';
const locationPermissionNotice =
  'Location permission is required to show your position. Enable it in system settings.';
const firebaseNotice =
  missingFirebaseKeys.length > 0
    ? `Firebase config missing: ${missingFirebaseKeys.join(', ')}. Update apps/mobile/.env and restart.`
    : '';

if (hasMapboxToken) {
  MapboxGL.setAccessToken(mapboxToken);
}

const severityColors: Record<HotspotRecord['severity_level'], string> = {
  Fatal: '#D7263D',
  Critical: '#1B9AAA',
  Minor: '#F4D35E',
  'Damage Only': '#111111',
};

export default function MapScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const cameraRef = useRef<CameraRef>(null);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const requestPermissions = async () => {
      if (!hasMapboxToken) return;
      if (Platform.OS === 'android') {
        try {
          const granted = await MapboxGL.requestAndroidLocationPermissions();
          setLocationPermissionGranted(granted);
          return;
        } catch (err) {
          console.warn('Failed to request location permission', err);
          setLocationPermissionGranted(false);
          return;
        }
      }
      setLocationPermissionGranted(true);
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchHotspots();
        if (mounted) {
          setHotspots(data);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError('Failed to load hotspots');
        }
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
  }, []);

  const centerOnUser = () => {
    if (!userLocation) return;
    cameraRef.current?.setCamera({
      centerCoordinate: userLocation,
      zoomLevel: 14,
      animationMode: 'flyTo',
      animationDuration: 800,
    });
  };

  const toggleFollowUser = () => {
    if (!userLocation) return;
    setFollowUser((prev) => !prev);
    if (!followUser) {
      centerOnUser();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {hasMapboxToken ? (
        <MapboxGL.MapView style={styles.map}>
          <MapboxGL.Camera
            ref={cameraRef}
            followUserLocation={followUser}
            followUserMode={followUser ? MapboxGL.UserTrackingMode.Follow : undefined}
            followZoomLevel={followUser ? 14 : undefined}
            zoomLevel={12}
            centerCoordinate={[3.3792, 6.5244]}
            animationMode="flyTo"
          />
          {locationPermissionGranted ? (
            <MapboxGL.UserLocation
              visible
              onUpdate={(location) => {
                const { longitude, latitude } = location.coords;
                if (typeof longitude === 'number' && typeof latitude === 'number') {
                  setUserLocation([longitude, latitude]);
                }
              }}
            />
          ) : null}
          {hotspots.map((hotspot) => (
            <MapboxGL.PointAnnotation
              key={hotspot.area_id}
              id={hotspot.area_id}
              coordinate={[hotspot.center_lng, hotspot.center_lat]}
            >
              <View
                style={[
                  styles.marker,
                  { backgroundColor: severityColors[hotspot.severity_level] },
                ]}
              />
            </MapboxGL.PointAnnotation>
          ))}
        </MapboxGL.MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.placeholderTitle}>Mapbox token missing</Text>
          <Text style={styles.placeholderText}>
            Set EXPO_PUBLIC_MAPBOX_TOKEN in apps/mobile/.env and rebuild the
            dev client.
          </Text>
        </View>
      )}
      <View style={styles.overlay}>
        <ScreenHeader
          title="RoadSafe"
          subtitle="Live risk map and incident hotspots."
        />
        {!hasMapboxToken ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Mapbox not configured</Text>
            <Text style={styles.bannerText}>{mapboxTokenNotice}</Text>
          </View>
        ) : null}
        {locationPermissionGranted === false ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Location disabled</Text>
            <Text style={styles.bannerText}>{locationPermissionNotice}</Text>
          </View>
        ) : null}
        {missingFirebaseKeys.length > 0 ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Firebase not configured</Text>
            <Text style={styles.bannerText}>{firebaseNotice}</Text>
          </View>
        ) : null}
        {loading ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" />
            <Text style={styles.statusText}>Loading hotspots...</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button label="Report" onPress={() => navigation.navigate('Report')} />
          <Button
            label="Settings"
            variant="secondary"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </View>
      {hasMapboxToken ? (
        <View style={styles.fabStack}>
          <Pressable
            style={[
              styles.locateButton,
              followUser && styles.locateButtonActive,
              !userLocation && styles.locateButtonDisabled,
            ]}
            onPress={toggleFollowUser}
            disabled={!userLocation}
          >
            <Ionicons name="navigate" size={18} color="#111" />
          </Pressable>
          <Pressable
            style={[
              styles.locateButton,
              !userLocation && styles.locateButtonDisabled,
            ]}
            onPress={centerOnUser}
            disabled={!userLocation}
          >
            <Ionicons name="locate" size={18} color="#111" />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f4f4f4',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 12,
    borderRadius: 8,
  },
  statusRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#333',
  },
  banner: {
    marginTop: 8,
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
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#D7263D',
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  fabStack: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    gap: 10,
  },
  locateButton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  locateButtonActive: {
    borderColor: '#111',
    backgroundColor: '#f5f5f5',
  },
  locateButtonDisabled: {
    opacity: 0.5,
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
