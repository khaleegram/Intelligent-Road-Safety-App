import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import { mapboxToken, missingFirebaseKeys } from '../config/env';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchDirections } from '../services/directions';
import { fetchAccidents, fetchHotspots } from '../services/firestore';
import { fetchGeocodeSuggestions, type GeocodeSuggestion } from '../services/geocoding';
import { computeHotspotsFromAccidents } from '../services/hotspotLogic';
import { sendLocalRiskAlert } from '../services/notifications';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, HotspotRecord } from '../types';

const hasMapboxToken = mapboxToken.length > 0;

if (hasMapboxToken) {
  MapboxGL.setAccessToken(mapboxToken);
}

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = createStyles(theme);
  const { isAdmin } = useAdminAccess();
  const mapboxTokenNotice = t('map.mapboxMissingText');
  const locationPermissionNotice = t('map.locationDisabledText');
  const firebaseNotice =
    missingFirebaseKeys.length > 0
      ? t('map.firebaseMissingText', { keys: missingFirebaseKeys.join(', ') })
      : '';
  const severityColors = useMemo(
    () => ({
      Fatal: theme.tokens.color.error,
      Critical: theme.tokens.color.warning,
      Minor: theme.tokens.color.secondary,
      'Damage Only': theme.tokens.color.info,
    }),
    [theme]
  );
  const severityIconColors = useMemo(
    () => ({
      Fatal: theme.tokens.color.textInverse,
      Critical: theme.tokens.color.textInverse,
      Minor: theme.tokens.color.textPrimary,
      'Damage Only': theme.tokens.color.textInverse,
    }),
    [theme]
  );
  const scrollRef = useRef<ScrollView>(null);
  const lastHotspotTapRef = useRef(0);
  const cameraRef = useRef<any>(null);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotRecord | null>(null);
  const [hotspotCallout, setHotspotCallout] = useState<HotspotRecord | null>(null);
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
  const [mapSectionOffsetY, setMapSectionOffsetY] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [compactBar, setCompactBar] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<
    boolean | null
  >(null);
  const [waitingForGps, setWaitingForGps] = useState(false);
  const [routeHotspotAlert, setRouteHotspotAlert] = useState<HotspotRecord | null>(
    null
  );
  const notifiedHotspotsRef = useRef<Set<string>>(new Set());

  const newestAccidentTs = useMemo(() => {
    if (accidents.length === 0) return 0;
    return accidents.reduce((latest, item) => {
      const ts = Date.parse(item.created_at ?? item.timestamp);
      if (Number.isNaN(ts)) return latest;
      return Math.max(latest, ts);
    }, 0);
  }, [accidents]);

  const newestHotspotTs = useMemo(() => {
    if (hotspots.length === 0) return 0;
    return hotspots.reduce((latest, item) => {
      const ts = Date.parse(item.last_updated ?? '');
      if (Number.isNaN(ts)) return latest;
      return Math.max(latest, ts);
    }, 0);
  }, [hotspots]);

  const hotspotsMayBeStale =
    hotspots.length > 0 &&
    newestAccidentTs > 0 &&
    newestHotspotTs > 0 &&
    newestAccidentTs > newestHotspotTs;

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
          setError(t('map.errorLoadHotspots'));
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
      setError(t('map.errorRouteCoords'));
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

  const focusHotspotOnMap = (hotspot: HotspotRecord) => {
    setSelectedHotspot(hotspot);
    setHotspotCallout(hotspot);
    setFollowUser(false);
    const target: [number, number] = [hotspot.center_lng, hotspot.center_lat];
    if (isMapFullscreen) {
      setIsMapFullscreen(false);
    }
    scrollRef.current?.scrollTo({
      y: Math.max(0, mapSectionOffsetY - theme.spacing.sm),
      animated: true,
    });
    cameraRef.current?.setCamera({
      centerCoordinate: target,
      zoomLevel: 14,
      animationMode: 'flyTo',
      animationDuration: 900,
    });
  };

  const handleMapPress = (event: any) => {
    if (Date.now() - lastHotspotTapRef.current < 300) {
      return;
    }
    if (selectedHotspot) {
      setSelectedHotspot(null);
      setHotspotCallout(null);
    }
    if (!routePickMode) return;
    const coords = event.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    handleRoutePick([lng, lat]);
  };

  const routeStart = userLocation ?? defaultCenter;
  const routeLine: GeoJSON.Feature<GeoJSON.LineString> | null =
    routeDestination != null
      ? {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
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

  const routeRiskScore = useMemo(() => {
    if (!routeDestination || warningHotspots.length === 0) {
      return 0;
    }
    const score = warningHotspots.reduce((total, hotspot) => {
      const weight =
        hotspot.severity_level === 'Fatal'
          ? 4
          : hotspot.severity_level === 'Critical'
            ? 3
            : hotspot.severity_level === 'Minor'
              ? 2
              : 1;
      return total + weight * hotspot.accident_count;
    }, 0);
    return score;
  }, [routeDestination, warningHotspots]);

  useEffect(() => {
    if (!userLocation || warningHotspots.length === 0) {
      setRouteHotspotAlert(null);
      return;
    }
    const nearby = warningHotspots.find((hotspot) => {
      const distance = distanceMeters(
        userLocation,
        [hotspot.center_lng, hotspot.center_lat]
      );
      return distance <= warningThresholdMeters;
    });
    if (!nearby) {
      setRouteHotspotAlert(null);
      return;
    }
    if (notifiedHotspotsRef.current.has(nearby.area_id)) {
      return;
    }
    notifiedHotspotsRef.current.add(nearby.area_id);
    setRouteHotspotAlert(nearby);
    sendLocalRiskAlert({
      title: t('map.routeAlertTitle'),
      body: t('map.routeAlertText', { severity: nearby.severity_level }),
      data: { hotspotId: nearby.area_id },
    }).catch((error) => console.error('Risk alert notification failed', error));
  }, [userLocation, warningHotspots]);

  const accidentsGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: 'FeatureCollection' as const,
      features: accidents.map((accident) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Point' as const,
          coordinates: [accident.longitude, accident.latitude],
        },
      })),
    }),
    [accidents]
  );

  const hotspotsGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: 'FeatureCollection' as const,
      features: hotspots.map((hotspot) => ({
        type: 'Feature' as const,
        properties: {
          area_id: hotspot.area_id,
          severity: hotspot.severity_level,
          color: severityColors[hotspot.severity_level],
          iconColor: severityIconColors[hotspot.severity_level],
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [hotspot.center_lng, hotspot.center_lat],
        },
      })),
    }),
    [hotspots, severityColors, severityIconColors]
  );

  const mapContent = (
    <View style={styles.mapStack} pointerEvents="box-none">
      {hasMapboxToken ? (
        <MapboxGL.MapView
          style={styles.map}
          surfaceView={false}
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
          {accidents.length > 0 ? (
            <MapboxGL.ShapeSource
              id="accidents-source"
              shape={accidentsGeoJson}
              cluster
              clusterRadius={28}
            >
              <MapboxGL.CircleLayer
                id="accidents-cluster"
                filter={['has', 'point_count']}
                style={{
                  circleColor: theme.colors.info,
                  circleRadius: 14,
                  circleOpacity: 0.8,
                }}
              />
              <MapboxGL.SymbolLayer
                id="accidents-cluster-count"
                filter={['has', 'point_count']}
                style={{
                  textField: ['get', 'point_count_abbreviated'],
                  textSize: 11,
                  textColor: theme.tokens.color.textInverse,
                }}
              />
              <MapboxGL.CircleLayer
                id="accidents-unclustered"
                filter={['!', ['has', 'point_count']]}
                style={{
                  circleColor: theme.colors.info,
                  circleRadius: 3,
                  circleOpacity: 0.9,
                  circleStrokeColor: theme.colors.surface,
                  circleStrokeWidth: 1,
                }}
              />
            </MapboxGL.ShapeSource>
          ) : null}
          {hotspots.length > 0 ? (
            <MapboxGL.ShapeSource
              id="hotspots-source"
              shape={hotspotsGeoJson}
              onPress={(event) => {
                const feature = event.features?.[0];
                const areaId = feature?.properties?.area_id as string | undefined;
                if (!areaId) return;
                const found = hotspots.find((item) => item.area_id === areaId);
                if (found) {
                  lastHotspotTapRef.current = Date.now();
                  setSelectedHotspot(found);
                  setHotspotCallout(found);
                }
              }}
            >
              <MapboxGL.CircleLayer
                id="hotspot-circles"
                style={{
                  circleColor: ['get', 'color'],
                  circleRadius: 16,
                  circleOpacity: 0.95,
                  circleStrokeColor: theme.colors.surface,
                  circleStrokeWidth: 2,
                }}
              />
              <MapboxGL.SymbolLayer
                id="hotspot-icon"
                style={{
                  textField: '!',
                  textSize: 14,
                  textColor: ['get', 'iconColor'],
                  textAllowOverlap: true,
                  textIgnorePlacement: true,
                }}
              />
            </MapboxGL.ShapeSource>
          ) : null}
          
        </MapboxGL.MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.placeholderTitle}>{t('map.mapboxMissingTitle')}</Text>
          <Text style={styles.placeholderText}>
            {t('map.mapboxMissingText')}
          </Text>
        </View>
      )}
      {hotspotCallout ? (
        <View pointerEvents="none" style={styles.calloutOverlay}>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>{t('map.hotspotTitle')}</Text>
            <Text style={styles.calloutText}>
              {t('map.hotspotSeverity', { value: hotspotCallout.severity_level })}
            </Text>
            <Text style={styles.calloutText}>
              {t('map.hotspotAccidents', { value: hotspotCallout.accident_count })}
            </Text>
            <Text style={styles.calloutText}>
              {t('map.hotspotRisk', { value: hotspotCallout.risk_score })}
            </Text>
          </View>
          <View style={styles.calloutArrow} />
        </View>
      ) : null}
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
        stickyHeaderIndices={[0]}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const shouldCompact = event.nativeEvent.contentOffset.y > theme.tokens.spacing[2];
          if (shouldCompact !== compactBar) {
            setCompactBar(shouldCompact);
          }
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.screenContent,
          { paddingBottom: theme.spacing.lg + tabBarHeight },
        ]}
      >
        <View style={styles.topBar}>
          <IslandBar
            eyebrow={t('map.eyebrow')}
            title={t('map.title')}
            subtitle={t('map.subtitle')}
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
          <IslandCard
            style={styles.mapSectionOuter}
            contentStyle={styles.mapSectionInner}
            onLayout={(event: any) => {
              setMapSectionHeight(event.nativeEvent.layout.height);
              setMapSectionOffsetY(event.nativeEvent.layout.y);
            }}
          >
            <View style={styles.mapSection} pointerEvents="box-none">
              {mapContent}
            </View>
          </IslandCard>
          <View style={styles.panel}>
          {!hasMapboxToken ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>{t('map.mapboxMissingTitle')}</Text>
              <Text style={styles.bannerText}>{mapboxTokenNotice}</Text>
            </View>
          ) : null}
          {locationPermissionGranted === false ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>{t('map.locationDisabledTitle')}</Text>
              <Text style={styles.bannerText}>{locationPermissionNotice}</Text>
            </View>
          ) : null}
          {waitingForGps ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>{t('map.waitingGpsTitle')}</Text>
              <Text style={styles.bannerText}>
                {t('map.waitingGpsText')}
              </Text>
            </View>
          ) : null}
          {missingFirebaseKeys.length > 0 ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>{t('map.firebaseMissingTitle')}</Text>
              <Text style={styles.bannerText}>{firebaseNotice}</Text>
            </View>
          ) : null}
          {hotspotsMayBeStale ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Hotspots may be outdated</Text>
              <Text style={styles.bannerText}>
                New accidents exist after last hotspot update. Re-run the hotspot pipeline to refresh hotspot points.
              </Text>
            </View>
          ) : null}
          {loading ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.statusText}>{t('map.loadingHotspots')}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {routeHotspotAlert ? (
            <View style={styles.routeAlert}>
              <Text style={styles.routeAlertTitle}>{t('map.routeAlertTitle')}</Text>
              <Text style={styles.routeAlertText}>
                {t('map.routeAlertText', {
                  severity: routeHotspotAlert.severity_level,
                })}
              </Text>
            </View>
          ) : null}
          <IslandCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('map.legendTitle')}</Text>
              <Text style={styles.sectionHint}>{t('map.legendHint')}</Text>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.marker, styles.legendMarker]}>
                  <Ionicons
                    name="warning"
                    size={10}
                    color={theme.tokens.color.textInverse}
                  />
                </View>
                <Text style={styles.legendText}>{t('map.legendHotspot')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.accidentMarker} />
                <Text style={styles.legendText}>{t('map.legendAccident')}</Text>
              </View>
            </View>
            <View style={styles.severityLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.severityDot, { backgroundColor: severityColors.Fatal }]} />
                <Text style={styles.legendText}>Fatal</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.severityDot, { backgroundColor: severityColors.Critical }]}
                />
                <Text style={styles.legendText}>Critical</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.severityDot, { backgroundColor: severityColors.Minor }]} />
                <Text style={styles.legendText}>Minor</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.severityDot,
                    { backgroundColor: severityColors['Damage Only'] },
                  ]}
                />
                <Text style={styles.legendText}>Damage Only</Text>
              </View>
            </View>
          </IslandCard>
          <IslandCard style={styles.routeCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('map.routeTitle')}</Text>
              <Text style={styles.sectionHint}>{t('map.routeHint')}</Text>
            </View>
            <TextInput
              style={styles.routeSearchInput}
              placeholder={t('map.routeSearchPlaceholder')}
              value={routeQuery}
              onChangeText={setRouteQuery}
              placeholderTextColor={theme.tokens.color.textSecondary}
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
              <Text style={styles.routeHint}>{t('map.routeSearching')}</Text>
            ) : null}
            {routeSuggestions.length > 0 ? (
              <View style={styles.suggestionList}>
                {routeSuggestions.map((item, index) => (
                  <Pressable
                    key={`${item.id}-${index}`}
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
                placeholder={t('map.routeLatPlaceholder')}
                value={routeLat}
                onChangeText={setRouteLat}
                keyboardType="numeric"
                placeholderTextColor={theme.tokens.color.textSecondary}
              />
              <TextInput
                style={styles.routeInput}
                placeholder={t('map.routeLngPlaceholder')}
                value={routeLng}
                onChangeText={setRouteLng}
                keyboardType="numeric"
                placeholderTextColor={theme.tokens.color.textSecondary}
              />
            </View>
            <View style={styles.routeActions}>
              <Button label={t('map.routeSet')} onPress={setRoute} style={styles.routeButton} />
              <Button
                label={routePickMode ? t('map.routePickActive') : t('map.routePick')}
                variant="secondary"
                onPress={() => setRoutePickMode((prev) => !prev)}
                style={styles.routeButtonSecondary}
              />
              <Button
                label={t('map.routeClear')}
                variant="secondary"
                onPress={clearRoute}
                style={styles.routeButtonSecondary}
              />
            </View>
          <Text style={styles.routeHint}>
            {t('map.routeWarningRadius', { meters: warningThresholdMeters })}
          </Text>
          {routeDestination && routeLoading ? (
            <Text style={styles.routeHint}>{t('map.routeFinding')}</Text>
          ) : null}
          {routeDestination && routeDistanceMeters != null ? (
            <Text style={styles.routeDistance}>
              {t('map.routeDistance', {
                km: (routeDistanceMeters / 1000).toFixed(1),
              })}
            </Text>
          ) : routeDestination && !userLocation ? (
            <Text style={styles.routeDistance}>{t('map.routeNoLocation')}</Text>
          ) : null}
          {routeDestination && warningHotspots.length > 0 ? (
            <View style={styles.routeWarning}>
              <Text style={styles.routeWarningText}>
                {t('map.routeWarningText', {
                  count: warningHotspots.length,
                  plural: warningHotspots.length === 1 ? '' : 's',
                })}
                </Text>
              </View>
            ) : null}
          {routeDestination && warningHotspots.length === 0 ? (
            <Text style={styles.routeOkText}>{t('map.routeOk')}</Text>
          ) : null}
          {routeDestination ? (
            <Text style={styles.routeDistance}>
              Route risk score: {routeRiskScore}
            </Text>
          ) : null}
          {routeDestination && warningHotspots.length > 0 ? (
            <View style={styles.routeHotspotList}>
              {warningHotspots.map((hotspot) => (
                <Pressable
                  key={hotspot.area_id}
                  style={styles.routeHotspotRow}
                  onPress={() => focusHotspotOnMap(hotspot)}
                >
                  <View style={styles.routeHotspotHeader}>
                    <Text style={styles.routeHotspotTitle}>
                      {t('map.hotspotTitle')} - {hotspot.severity_level}
                    </Text>
                    <Text style={styles.routeHotspotMeta}>
                      {hotspot.accident_count}{' '}
                      {t('map.legendAccident').toLowerCase()}
                    </Text>
                  </View>
                  <Text style={styles.routeHotspotLocation}>
                    {t('map.hotspotLocation', {
                      lat: hotspot.center_lat.toFixed(5),
                      lng: hotspot.center_lng.toFixed(5),
                    })}
                  </Text>
                  <Text style={styles.routeHotspotTapHint}>Tap to open hotspot popup</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </IslandCard>
          {selectedHotspot ? (
            <IslandCard variant="accent" style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailTitle}>{t('map.hotspotTitle')}</Text>
                <Pressable onPress={() => setSelectedHotspot(null)}>
                  <Text style={styles.detailClose}>{t('common.close')}</Text>
                </Pressable>
              </View>
              <Text style={styles.detailText}>
                {t('map.hotspotSeverity', { value: selectedHotspot.severity_level })}
              </Text>
              <Text style={styles.detailText}>
                {t('map.hotspotAccidents', { value: selectedHotspot.accident_count })}
              </Text>
              <Text style={styles.detailText}>
                {t('map.hotspotRisk', { value: selectedHotspot.risk_score })}
              </Text>
            </IslandCard>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={t('common.reportIncident')}
              onPress={() => navigation.navigate('Public', { screen: 'Report' })}
            />
            <Button
              label={t('common.settings')}
              variant="secondary"
              onPress={() => navigation.navigate('Public', { screen: 'Settings' })}
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
  mapSectionOuter: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: 1.5,
  },
  mapSectionInner: {
    padding: 0,
    overflow: 'hidden',
  },
  mapSection: {
    height: 360,
    position: 'relative',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
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
    borderRadius: theme.tokens.radius.full,
    padding: 12,
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
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  topBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.tokens.spacing[1],
    backgroundColor: theme.tokens.color.background,
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
    marginTop: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.tokens.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.tokens.color.border,
  },
  bannerTitle: {
    fontSize: theme.tokens.typography.fontSize.sm,
    fontWeight: '700',
    color: theme.tokens.color.textPrimary,
  },
  bannerText: {
    marginTop: 4,
    fontSize: theme.tokens.typography.fontSize.xs,
    color: theme.tokens.color.textSecondary,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.danger,
  },
  card: {
    padding: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.xs,
    gap: 8,
  },
  sectionTitle: {
    fontSize: theme.tokens.typography.fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: theme.colors.text,
  },
  sectionHint: {
    fontSize: theme.tokens.typography.fontSize.xs,
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
    fontSize: theme.tokens.typography.fontSize.xs,
    color: theme.colors.textMuted,
  },
  severityLegend: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  routeCard: {
    padding: theme.spacing.md,
  },
  routeSearchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.tokens.typography.fontSize.sm,
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
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.tokens.typography.fontSize.sm,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
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
    flexGrow: 1,
    minWidth: 120,
  },
  routeButtonSecondary: {
    flexGrow: 1,
    minWidth: 120,
  },
  routeWarning: {
    marginTop: 8,
    padding: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.tokens.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.tokens.color.error,
  },
  routeWarningText: {
    fontSize: 12,
    color: theme.tokens.color.error,
  },
  routeOkText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.success,
  },
  routeHotspotList: {
    marginTop: 8,
    gap: 8,
  },
  routeHotspotRow: {
    padding: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  routeHotspotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeHotspotTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  routeHotspotMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  routeHotspotLocation: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSoft,
  },
  routeHotspotTapHint: {
    marginTop: 6,
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  routeAlert: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.tokens.color.warning,
    backgroundColor: theme.tokens.color.surfaceElevated,
  },
  routeAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.tokens.color.warning,
  },
  routeAlertText: {
    marginTop: 4,
    fontSize: 11,
    color: theme.tokens.color.warning,
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
    borderRadius: theme.tokens.radius.full,
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: theme.shadow.radius,
    shadowOffset: theme.shadow.offset,
    elevation: 3,
  },
  locateButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceAlt,
  },
  locateButtonDisabled: {
    opacity: 0.5,
  },
  detailCard: {
    marginTop: 10,
    padding: 10,
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
    color: theme.tokens.color.textInverse,
  },
  detailClose: {
    fontSize: 12,
    color: theme.tokens.color.textInverse,
  },
  detailText: {
    fontSize: 12,
    color: theme.tokens.color.textInverse,
    marginBottom: 2,
  },
  callout: {
    minWidth: 160,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  calloutOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    elevation: 10,
    alignItems: 'center',
  },
  calloutArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.colors.surface,
    marginTop: -1,
  },
  calloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
