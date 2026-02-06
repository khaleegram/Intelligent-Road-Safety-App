import MapboxGL from '@rnmapbox/maps';
import type { CameraRef } from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
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
import { fetchDirections } from '../services/directions';
import { fetchAccidents, fetchHotspots } from '../services/firestore';
import { fetchGeocodeSuggestions, type GeocodeSuggestion } from '../services/geocoding';
import { computeHotspotsFromAccidents } from '../services/hotspotLogic';
import { type Theme, useTheme } from '../theme';
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

const getSeverityColors = (theme: Theme) => ({
  Fatal: theme.colors.danger,
  Critical: theme.colors.accent,
  Minor: theme.colors.warning,
  'Damage Only': theme.colors.textSoft,
});

const defaultCenter: [number, number] = [8.6753, 9.082];
const nigeriaBounds: { ne: [number, number]; sw: [number, number] } = {
  ne: [14.678014, 13.885645],
  sw: [2.676932, 4.1821],
};
const warningThresholdMeters = 400;
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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = createStyles(theme);
  const severityColors = getSeverityColors(theme);
  const scrollRef = useRef<ScrollView>(null);
  const cameraRef = useRef<CameraRef>(null);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
  const [followUser, setFollowUser] = useState(true);
  const [routeLat, setRouteLat] = useState('');
  const [routeLng, setRouteLng] = useState('');
  const [routeQuery, setRouteQuery] = useState('');
  const [routeSuggestions, setRouteSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [routeSearching, setRouteSearching] = useState(false);
  const [routeDestination, setRouteDestination] = useState<[number, number] | null>(
    null
  );
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routePickMode, setRoutePickMode] = useState(false);
  const [routeSearchFocused, setRouteSearchFocused] = useState(false);
  const [mapSectionHeight, setMapSectionHeight] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<
    boolean | null
  >(null);
  const [waitingForGps, setWaitingForGps] = useState(false);

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
    if (!locationPermissionGranted || userLocation) {
      setWaitingForGps(false);
      return;
    }
    const handle = setTimeout(() => {
      if (!userLocation) {
        setWaitingForGps(true);
      }
    }, 3000);
    return () => clearTimeout(handle);
  }, [locationPermissionGranted, userLocation]);


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

  useEffect(() => {
    if (!hasMapboxToken) return;
    if (routeQuery.trim().length < 3) {
      setRouteSuggestions([]);
      return;
    }

    const handle = setTimeout(() => {
      setRouteSearching(true);
      fetchGeocodeSuggestions(
        routeQuery,
        mapboxToken,
        5,
        userLocation ?? undefined,
        'ng',
        [nigeriaBounds.sw[0], nigeriaBounds.sw[1], nigeriaBounds.ne[0], nigeriaBounds.ne[1]]
      )
        .then((results) => setRouteSuggestions(results))
        .catch(() => setRouteSuggestions([]))
        .finally(() => setRouteSearching(false));
    }, 350);

    return () => clearTimeout(handle);
  }, [routeQuery]);

  useEffect(() => {
    if (!hasMapboxToken || !routeDestination) {
      setRouteGeometry(null);
      setRouteDistanceMeters(null);
      return;
    }

    const start = userLocation ?? defaultCenter;
    let active = true;
    const handle = setTimeout(() => {
      setRouteLoading(true);
      fetchDirections(start, routeDestination, mapboxToken)
        .then((result) => {
          if (!active) return;
          setRouteGeometry(result.geometry);
          setRouteDistanceMeters(result.distanceMeters);
        })
        .catch(() => {
          if (!active) return;
          setRouteGeometry(null);
          setRouteDistanceMeters(null);
        })
        .finally(() => {
          if (!active) return;
          setRouteLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [routeDestination, userLocation]);

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
    setRouteGeometry(null);
    setRouteDistanceMeters(null);
    setRouteLat('');
    setRouteLng('');
    setRouteQuery('');
    setRouteSuggestions([]);
    setRoutePickMode(false);
  };

  const handleRoutePick = (coords: [number, number]) => {
    setRouteDestination(coords);
    setRouteLat(coords[1].toFixed(6));
    setRouteLng(coords[0].toFixed(6));
    setRouteGeometry(null);
    setRoutePickMode(false);
  };

  const handleRouteSuggestion = (suggestion: GeocodeSuggestion) => {
    setRouteDestination(suggestion.center);
    setRouteLat(suggestion.center[1].toFixed(6));
    setRouteLng(suggestion.center[0].toFixed(6));
    setRouteQuery(suggestion.place_name);
    setRouteSuggestions([]);
    setRouteGeometry(null);
    cameraRef.current?.setCamera({
      centerCoordinate: suggestion.center,
      zoomLevel: 12,
      animationMode: 'flyTo',
      animationDuration: 800,
    });
  };

  const handleMapPress = (event: MapboxGL.OnPressEvent) => {
    if (!routePickMode) return;
    const coords = event.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    handleRoutePick([lng, lat]);
  };

  const routeStart = userLocation ?? defaultCenter;
  const routeLine =
    routeDestination != null
      ? {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeGeometry?.coordinates ?? [routeStart, routeDestination],
          },
        }
      : null;

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

  const mapContent = (
    <View style={styles.mapStack} pointerEvents="box-none">
      {hasMapboxToken ? (
        <MapboxGL.MapView
          style={styles.map}
          onPress={handleMapPress}
          onTouchStart={() => setScrollEnabled(false)}
          onTouchEnd={() => setScrollEnabled(true)}
          onTouchCancel={() => setScrollEnabled(true)}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            followUserLocation={followUser}
            followUserMode={followUser ? MapboxGL.UserTrackingMode.Follow : undefined}
            followZoomLevel={followUser ? 14 : undefined}
            minZoomLevel={5}
            maxBounds={nigeriaBounds}
            zoomLevel={12}
            centerCoordinate={userLocation ?? defaultCenter}
            animationMode="flyTo"
          />
          {locationPermissionGranted ? (
                <MapboxGL.UserLocation
                  visible
                  androidRenderMode="normal"
                  renderMode={MapboxGL.UserLocationRenderMode.Normal}
                  showsUserHeadingIndicator
                  onUpdate={(location) => {
                    const { longitude, latitude } = location.coords;
                if (typeof longitude === 'number' && typeof latitude === 'number') {
                  const coords: [number, number] = [longitude, latitude];
                  setUserLocation(coords);
                  if (!hasCenteredOnUser && !routeDestination) {
                    cameraRef.current?.setCamera({
                      centerCoordinate: coords,
                      zoomLevel: 13,
                      animationMode: 'flyTo',
                      animationDuration: 800,
                    });
                    setHasCenteredOnUser(true);
                  }
                }
              }}
            />
          ) : null}
          {routeLine ? (
            <MapboxGL.ShapeSource id="route-source" shape={routeLine}>
              <MapboxGL.LineLayer
                id="route-line"
                style={{ lineColor: theme.colors.accent, lineWidth: 3 }}
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
      {hasMapboxToken ? (
        <View style={styles.fabStack} pointerEvents="box-none">
          <Pressable
            style={[
              styles.locateButton,
              followUser && styles.locateButtonActive,
              !userLocation && styles.locateButtonDisabled,
            ]}
            onPress={toggleFollowUser}
            disabled={!userLocation}
          >
            <Ionicons name="navigate" size={18} color={theme.colors.text} />
          </Pressable>
          <Pressable
            style={[
              styles.locateButton,
              !userLocation && styles.locateButtonDisabled,
            ]}
            onPress={centerOnUser}
            disabled={!userLocation}
          >
            <Ionicons name="locate" size={18} color={theme.colors.text} />
          </Pressable>
          <Pressable
            style={styles.locateButton}
            onPress={() => setIsMapFullscreen(true)}
          >
            <Ionicons name="expand" size={18} color={theme.colors.text} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Modal visible={isMapFullscreen} animationType="slide">
        <SafeAreaView style={styles.fullscreenContainer} edges={['top', 'left', 'right']}>
          <View style={styles.fullscreenMap}>{mapContent}</View>
          <Pressable
            style={styles.fullscreenClose}
            onPress={() => setIsMapFullscreen(false)}
          >
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </Pressable>
        </SafeAreaView>
      </Modal>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.screenContent,
          { paddingBottom: theme.spacing.lg + tabBarHeight },
        ]}
      >
          <View
            style={styles.mapSection}
            pointerEvents="box-none"
            onLayout={(event) => setMapSectionHeight(event.nativeEvent.layout.height)}
          >
            {mapContent}
          </View>
          <View style={styles.panel}>
          <ScreenHeader
            eyebrow="Risk Map"
            title="RoadSafe"
            subtitle="Hotspots, incidents, and route warnings in one place."
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
          {waitingForGps ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Waiting for GPS</Text>
              <Text style={styles.bannerText}>
                Turn on device location services to show your position.
              </Text>
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
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Legend</Text>
              <Text style={styles.sectionHint}>Tap hotspots for details</Text>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.marker, styles.legendMarker]} />
                <Text style={styles.legendText}>Hotspot (severity)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.accidentMarker} />
                <Text style={styles.legendText}>Accident</Text>
              </View>
            </View>
          </View>
          <View style={styles.routeCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Route Warning</Text>
              <Text style={styles.sectionHint}>
                Check if your route passes risk zones
              </Text>
            </View>
            <TextInput
              style={styles.routeSearchInput}
              placeholder="Search destination (e.g., Garki Area 1)"
              value={routeQuery}
              onChangeText={setRouteQuery}
              placeholderTextColor={theme.colors.textSoft}
              onFocus={() => {
                setRouteSearchFocused(true);
                scrollRef.current?.scrollTo({
                  y: mapSectionHeight,
                  animated: true,
                });
              }}
              onBlur={() => setRouteSearchFocused(false)}
            />
            {routeSearching ? (
              <Text style={styles.routeHint}>Searching locations...</Text>
            ) : null}
            {routeSuggestions.length > 0 ? (
              <View style={styles.suggestionList}>
                {routeSuggestions.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleRouteSuggestion(item)}
                    style={styles.suggestionItem}
                  >
                    <Text style={styles.suggestionTitle}>{item.name}</Text>
                    <Text style={styles.suggestionSubtitle}>{item.place_name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.routeRow}>
              <TextInput
                style={styles.routeInput}
                placeholder="Destination latitude"
                value={routeLat}
                onChangeText={setRouteLat}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.routeInput}
                placeholder="Destination longitude"
                value={routeLng}
                onChangeText={setRouteLng}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.routeActions}>
              <Pressable style={styles.routeButton} onPress={setRoute}>
                <Text style={styles.routeButtonText}>Set route</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.routeButtonSecondary,
                  routePickMode && styles.routeButtonSecondaryActive,
                ]}
                onPress={() => setRoutePickMode((prev) => !prev)}
              >
                <Text style={styles.routeButtonSecondaryText}>
                  {routePickMode ? 'Tap map to set destination' : 'Pick on map'}
                </Text>
              </Pressable>
              <Pressable style={styles.routeButtonSecondary} onPress={clearRoute}>
                <Text style={styles.routeButtonSecondaryText}>Clear</Text>
              </Pressable>
            </View>
          <Text style={styles.routeHint}>
            Warning radius: {warningThresholdMeters}m from your route.
          </Text>
          {routeDestination && routeLoading ? (
            <Text style={styles.routeHint}>Finding best route...</Text>
          ) : null}
          {routeDestination && routeDistanceMeters != null ? (
            <Text style={styles.routeDistance}>
              Distance: {(routeDistanceMeters / 1000).toFixed(1)} km
            </Text>
          ) : routeDestination && !userLocation ? (
            <Text style={styles.routeDistance}>Enable location for distance.</Text>
          ) : null}
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
            <Button
              label="Report incident"
              onPress={() => navigation.navigate('Report')}
            />
            <Button
              label="Settings"
              variant="secondary"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
          {routeSearchFocused ? (
            <View style={{ height: mapSectionHeight }} />
          ) : null}
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
  map: {
    flex: 1,
  },
  mapStack: {
    flex: 1,
    position: 'relative',
  },
  screenContent: {
    backgroundColor: theme.colors.bg,
  },
  mapSection: {
    height: 300,
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    position: 'relative',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  fullscreenMap: {
    flex: 1,
  },
  fullscreenClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: theme.shadow.radius,
    shadowOffset: theme.shadow.offset,
    elevation: 3,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.surfaceAlt,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  panel: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statusRow: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  banner: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
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
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.danger,
  },
  card: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.xs,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: theme.colors.text,
  },
  sectionHint: {
    fontSize: 11,
    color: theme.colors.textSoft,
    flexShrink: 1,
  },
  legend: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendMarker: {
    backgroundColor: theme.colors.danger,
  },
  legendText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  routeCard: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routeSearchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  routeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  routeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    backgroundColor: theme.colors.surfaceAlt,
  },
  routeActions: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
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
  routeHint: {
    marginTop: 8,
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  routeDistance: {
    marginTop: theme.spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  routeButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    flexGrow: 1,
    alignItems: 'center',
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  routeButtonSecondary: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    flexGrow: 1,
    alignItems: 'center',
  },
  routeButtonSecondaryActive: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  routeButtonSecondaryText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  routeWarning: {
    marginTop: 8,
    padding: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  routeWarningText: {
    fontSize: 12,
    color: '#9f1239',
  },
  routeOkText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.success,
  },
  actions: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  accidentMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.info,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  fabStack: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 10,
    zIndex: 5,
    elevation: 5,
  },
  locateButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: theme.shadow.radius,
    shadowOffset: theme.shadow.offset,
    elevation: 3,
  },
  locateButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor:
      theme.colors.bg === '#0b1220' ? theme.colors.surfaceAlt : '#fff7ed',
  },
  locateButtonDisabled: {
    opacity: 0.5,
  },
  detailCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
  },
  detailClose: {
    fontSize: 12,
    color: theme.colors.accent,
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  });
