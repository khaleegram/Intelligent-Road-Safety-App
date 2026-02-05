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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { mapboxToken, missingFirebaseKeys } from '../config/env';
import type { RootTabParamList } from '../navigation/RootNavigator';
import { fetchAccidents, fetchHotspots } from '../services/firestore';
import { computeHotspotsFromAccidents } from '../services/hotspotLogic';
import type { AccidentRecord, HotspotRecord } from '../types';

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

const defaultCenter: [number, number] = [3.3792, 6.5244];
const earthRadiusMeters = 6371000;
const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceMeters = (a: [number, number], b: [number, number]) => {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(rLat1) * Math.cos(rLat2) * sinDLng * sinDLng;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
};

const distancePointToSegmentMeters = (
  point: [number, number],
  start: [number, number],
  end: [number, number]
) => {
  if (start[0] === end[0] && start[1] === end[1]) {
    return distanceMeters(point, start);
  }

  const [pLng, pLat] = point;
  const lat0 = toRadians(pLat);
  const scale = Math.cos(lat0) * earthRadiusMeters;
  const toXY = ([lng, lat]: [number, number]) => {
    return {
      x: toRadians(lng) * scale,
      y: toRadians(lat) * earthRadiusMeters,
    };
  };

  const p = toXY(point);
  const a = toXY(start);
  const b = toXY(end);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const abLen2 = abx * abx + aby * aby;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
  const closest = { x: a.x + abx * t, y: a.y + aby * t };
  const dx = p.x - closest.x;
  const dy = p.y - closest.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export default function MapScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const cameraRef = useRef<CameraRef>(null);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(false);
  const [routeLat, setRouteLat] = useState('');
  const [routeLng, setRouteLng] = useState('');
  const [routeDestination, setRouteDestination] = useState<[number, number] | null>(
    null
  );
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
        let data: HotspotRecord[] = [];
        let accidentData: AccidentRecord[] = [];
        try {
          data = await fetchHotspots();
        } catch (hotspotError) {
          console.warn('Hotspot fetch failed, falling back to local compute.', hotspotError);
        }

        if (data.length === 0) {
          accidentData = await fetchAccidents();
          data = computeHotspotsFromAccidents(accidentData);
        } else {
          accidentData = await fetchAccidents();
        }

        if (mounted) {
          setHotspots(data);
          setAccidents(accidentData);
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

  const setRoute = () => {
    const lat = Number(routeLat);
    const lng = Number(routeLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Route destination must be valid latitude/longitude.');
      return;
    }
    setError(null);
    setRouteDestination([lng, lat]);
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 12,
      animationMode: 'flyTo',
      animationDuration: 800,
    });
  };

  const clearRoute = () => {
    setRouteDestination(null);
    setRouteLat('');
    setRouteLng('');
  };

  const routeStart = userLocation ?? defaultCenter;
  const routeLine =
    routeDestination != null
      ? {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [routeStart, routeDestination],
          },
        }
      : null;

  const warningThresholdMeters = 500;
  const warningHotspots =
    routeDestination != null
      ? hotspots.filter((hotspot) => {
          const distance = distancePointToSegmentMeters(
            [hotspot.center_lng, hotspot.center_lat],
            routeStart,
            routeDestination
          );
          return distance <= warningThresholdMeters;
        })
      : [];

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
          {routeLine ? (
            <MapboxGL.ShapeSource id="route-source" shape={routeLine}>
              <MapboxGL.LineLayer
                id="route-line"
                style={{ lineColor: '#111', lineWidth: 3 }}
              />
            </MapboxGL.ShapeSource>
          ) : null}
          {accidents.map((accident) => (
            <MapboxGL.PointAnnotation
              key={accident.id ?? `${accident.latitude}-${accident.longitude}`}
              id={accident.id ?? `${accident.latitude}-${accident.longitude}`}
              coordinate={[accident.longitude, accident.latitude]}
            >
              <View style={styles.accidentMarker} />
            </MapboxGL.PointAnnotation>
          ))}
          {hotspots.map((hotspot) => (
            <MapboxGL.PointAnnotation
              key={hotspot.area_id}
              id={hotspot.area_id}
              coordinate={[hotspot.center_lng, hotspot.center_lat]}
              onSelected={() => setSelectedHotspot(hotspot)}
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
        <View style={styles.routeCard}>
          <Text style={styles.routeTitle}>Route warning check</Text>
          <View style={styles.routeRow}>
            <TextInput
              style={styles.routeInput}
              placeholder="Dest lat"
              value={routeLat}
              onChangeText={setRouteLat}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.routeInput}
              placeholder="Dest lng"
              value={routeLng}
              onChangeText={setRouteLng}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.routeActions}>
            <Pressable style={styles.routeButton} onPress={setRoute}>
              <Text style={styles.routeButtonText}>Set route</Text>
            </Pressable>
            <Pressable style={styles.routeButtonSecondary} onPress={clearRoute}>
              <Text style={styles.routeButtonSecondaryText}>Clear</Text>
            </Pressable>
          </View>
          {routeDestination && warningHotspots.length > 0 ? (
            <View style={styles.routeWarning}>
              <Text style={styles.routeWarningText}>
                Warning: {warningHotspots.length} hotspot
                {warningHotspots.length === 1 ? '' : 's'} near your route.
              </Text>
            </View>
          ) : null}
          {routeDestination && warningHotspots.length === 0 ? (
            <Text style={styles.routeOkText}>No hotspots near this route.</Text>
          ) : null}
        </View>
        {selectedHotspot ? (
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailTitle}>Hotspot</Text>
              <Pressable onPress={() => setSelectedHotspot(null)}>
                <Text style={styles.detailClose}>Close</Text>
              </Pressable>
            </View>
            <Text style={styles.detailText}>
              Severity: {selectedHotspot.severity_level}
            </Text>
            <Text style={styles.detailText}>
              Accidents: {selectedHotspot.accident_count}
            </Text>
            <Text style={styles.detailText}>
              Risk score: {selectedHotspot.risk_score}
            </Text>
          </View>
        ) : null}
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
  routeCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  routeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  routeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  routeActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  routeButton: {
    backgroundColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  routeButtonSecondary: {
    borderWidth: 1,
    borderColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  routeButtonSecondaryText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '600',
  },
  routeWarning: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fdecea',
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  routeWarningText: {
    fontSize: 12,
    color: '#721c24',
  },
  routeOkText: {
    marginTop: 8,
    fontSize: 12,
    color: '#2f6f2f',
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  accidentMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B9AAA',
    borderWidth: 1,
    borderColor: '#fff',
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
  detailCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
  },
  detailClose: {
    fontSize: 12,
    color: '#1B9AAA',
  },
  detailText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
