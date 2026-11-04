import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import IconButton from '../components/IconButton';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import AlertBanner from '../components/system/AlertBanner';
import { mapboxToken, missingFirebaseKeys } from '../config/env';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { PublicTabParamList } from '../navigation/PublicTabs';
import { fetchDirections } from '../services/directions';
import { fetchAccidents, fetchHotspots, readCachedAccidents, readCachedHotspots } from '../services/firestore';
import { fetchGeocodeSuggestions, type GeocodeSuggestion } from '../services/geocoding';
import { computeHotspotsFromAccidents } from '../services/hotspotLogic';
import { sendLocalRiskAlert } from '../services/notifications';
import { getAlertPreferences } from '../services/alertPreferences';
import { subscribeToConnectivity } from '../services/connectivity';
import { pushLocalAlert } from '../services/localAlerts';
import { fetchRiskPredictions } from '../services/riskPredictions';
import { fetchWeather } from '../services/weather';
import {
  endTripMonitoring,
  getConsent,
  isTripActive,
  setConsent,
  startTripMonitoring,
} from '../services/behaviour';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, HotspotRecord, RiskPrediction, WeatherSnapshot } from '../types';

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
  const route = useRoute<RouteProp<PublicTabParamList, 'Map'>>();
  const { theme, mode } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
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
      Fatal: theme.color.error,
      Critical: theme.color.warning,
      Minor: theme.color.secondary,
      'Damage Only': theme.color.info,
    }),
    [theme]
  );
  const severityIconColors = useMemo(
    () => ({
      Fatal: theme.color.textInverse,
      Critical: theme.color.textInverse,
      Minor: theme.color.textPrimary,
      'Damage Only': theme.color.textInverse,
    }),
    [theme]
  );
  const scrollRef = useRef<ScrollViewInstance>(null);
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
  const [focusCoordinate, setFocusCoordinate] = useState<[number, number] | null>(null);
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
  const [showCoords, setShowCoords] = useState(false);
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
  const [isOnline, setIsOnline] = useState(true);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [congestionLevel, setCongestionLevel] = useState<string | null>(null);
  const [mlPredictions, setMlPredictions] = useState<RiskPrediction[]>([]);
  const [alertRadiusMeters, setAlertRadiusMeters] = useState(warningThresholdMeters);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [consentGranted, setConsentGranted] = useState(false);
  const [tripActive, setTripActive] = useState(false);
  const [tripBusy, setTripBusy] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const { contentPadding } = useBreakpoint();
  const notifiedHotspotsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return subscribeToConnectivity(setIsOnline);
  }, []);

  useEffect(() => {
    const { focusLat, focusLng } = route.params ?? {};
    if (typeof focusLat !== 'number' || typeof focusLng !== 'number') return;
    const next: [number, number] = [focusLng, focusLat];
    setFocusCoordinate(next);
    setFollowUser(false);
    setHasCenteredOnUser(true);
    const handle = setTimeout(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: next,
        zoomLevel: 15,
        animationMode: 'flyTo',
        animationDuration: 600,
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [route.params]);

  useEffect(() => {
    getAlertPreferences().then((prefs) => {
      setAlertsEnabled(prefs.enabled);
      setAlertRadiusMeters(prefs.radiusMeters);
    });
  }, []);

  useEffect(() => {
    fetchRiskPredictions().then(setMlPredictions).catch(() => setMlPredictions([]));
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    let active = true;
    fetchWeather(userLocation[1], userLocation[0])
      .then((snapshot) => {
        if (active) setWeather(snapshot);
      })
      .catch(() => {
        if (active) setWeather(null);
      });
    return () => {
      active = false;
    };
  }, [userLocation]);

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
      const ts = Date.parse(item.data_through ?? item.last_updated ?? '');
      if (Number.isNaN(ts)) return latest;
      return Math.max(latest, ts);
    }, 0);
  }, [hotspots]);

  const hotspotsMayBeStale =
    hotspots.length > 0 &&
    newestAccidentTs > 0 &&
    newestHotspotTs > 0 &&
    newestAccidentTs > newestHotspotTs;

  const statusNotice = !isOnline
    ? {
        title: t('common.offline'),
        message: t('map.offlineBanner'),
        variant: 'error' as const,
      }
    : locationPermissionGranted === false
      ? {
          title: t('map.locationDisabledTitle'),
          message: locationPermissionNotice,
          variant: 'warning' as const,
        }
      : waitingForGps
        ? {
            title: t('map.waitingGpsTitle'),
            message: t('map.waitingGpsText'),
            variant: 'info' as const,
          }
        : !hasMapboxToken
          ? {
              title: t('map.mapboxMissingTitle'),
              message: mapboxTokenNotice,
              variant: 'error' as const,
            }
          : missingFirebaseKeys.length > 0
            ? {
                title: t('map.firebaseMissingTitle'),
                message: firebaseNotice,
                variant: 'warning' as const,
              }
            : hotspotsMayBeStale
              ? {
                  title: t('map.staleTitle'),
                  message: t('map.staleText'),
                  variant: 'warning' as const,
                }
              : null;

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
        // Paint instantly from disk, then silently refresh from Firestore.
        const [cachedHotspots, cachedAccidents] = await Promise.all([
          readCachedHotspots(),
          readCachedAccidents(),
        ]);
        if (mounted && cachedHotspots.length > 0) {
          setHotspots(cachedHotspots);
          setAccidents(cachedAccidents);
          setLoading(false);
        }

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
          setCongestionLevel(result.congestionLevel ?? null);
        })
        .catch(() => {
          if (!active) return;
          setRouteGeometry(null);
          setRouteDistanceMeters(null);
          setCongestionLevel(null);
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getConsent(), isTripActive()]).then(([consent, running]) => {
        if (!active) return;
        setConsentGranted(consent);
        setTripActive(running);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const startTrip = async () => {
    setTripBusy(true);
    try {
      const trip = await startTripMonitoring();
      setTripActive(trip != null);
      if (!trip) {
        if (!consentGranted) {
          setShowConsent(true);
        } else {
          Alert.alert(t('map.locationDisabledTitle'), t('map.locationDisabledText'));
        }
      }
    } finally {
      setTripBusy(false);
    }
  };

  const stopTrip = async () => {
    setTripBusy(true);
    try {
      await endTripMonitoring();
      setTripActive(false);
      Alert.alert(t('behaviour.title'), t('behaviour.tripSaved'));
    } finally {
      setTripBusy(false);
    }
  };

  const handleTripPress = () => {
    if (tripBusy) return;
    if (tripActive) {
      Alert.alert(t('behaviour.endTrip'), t('behaviour.endTripConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('behaviour.endTrip'),
          style: 'destructive',
          onPress: () => {
            void stopTrip();
          },
        },
      ]);
      return;
    }
    if (!consentGranted) {
      setShowConsent(true);
      return;
    }
    void startTrip();
  };

  const acceptTripConsent = async () => {
    await setConsent(true);
    setConsentGranted(true);
    setShowConsent(false);
    void startTrip();
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
      y: Math.max(0, mapSectionOffsetY - theme.space[3]),
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
          return distance <= alertRadiusMeters;
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
    if (!alertsEnabled || !userLocation || warningHotspots.length === 0) {
      setRouteHotspotAlert(null);
      return;
    }
    const nearby = warningHotspots.find((hotspot) => {
      const distance = distanceMeters(
        userLocation,
        [hotspot.center_lng, hotspot.center_lat]
      );
      return distance <= alertRadiusMeters;
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
    const title = t('map.routeAlertTitle');
    const body = t('map.routeAlertText', { severity: nearby.severity_level });
    pushLocalAlert({ title, message: body, type: 'proximity' }).catch(() => undefined);
    sendLocalRiskAlert({
      title,
      body,
      data: { hotspotId: nearby.area_id },
    }).catch((error) => console.error('Risk alert notification failed', error));
  }, [alertsEnabled, alertRadiusMeters, userLocation, warningHotspots, t]);

  const accidentsGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: 'FeatureCollection' as const,
      features: accidents.slice(0, 600).map((accident) => ({
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
      features: [...hotspots]
        .sort(
          (a, b) =>
            b.risk_score - a.risk_score || b.accident_count - a.accident_count
        )
        .slice(0, 20)
        .map((hotspot) => ({
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
          styleURL={
            mode === 'dark'
              ? 'mapbox://styles/mapbox/dark-v11'
              : 'mapbox://styles/mapbox/light-v11'
          }
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
            centerCoordinate={focusCoordinate ?? userLocation ?? defaultCenter}
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
                style={{ lineColor: theme.color.primary, lineWidth: 3 }}
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
                  circleColor: theme.color.info,
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
                  textColor: theme.color.textInverse,
                }}
              />
              <MapboxGL.CircleLayer
                id="accidents-unclustered"
                filter={['!', ['has', 'point_count']]}
                style={{
                  circleColor: theme.color.info,
                  circleRadius: 3,
                  circleOpacity: 0.9,
                  circleStrokeColor: theme.color.surface,
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
                  circleStrokeColor: theme.color.surface,
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
          <IconButton
            icon={
              <Ionicons
                name={tripActive ? 'car' : 'car-outline'}
                size={20}
                color={tripActive ? theme.color.primary : theme.color.textPrimary}
              />
            }
            accessibilityLabel={
              tripActive ? t('behaviour.endTrip') : t('behaviour.startTrip')
            }
            variant="solid"
            badge={tripActive}
            onPress={handleTripPress}
          />
          <IconButton
            icon={
              <Ionicons
                name={followUser ? 'navigate' : 'navigate-outline'}
                size={20}
                color={theme.color.textPrimary}
              />
            }
            accessibilityLabel={t('map.follow')}
            variant="solid"
            disabled={!userLocation}
            onPress={toggleFollowUser}
          />
          <IconButton
            icon={<Ionicons name="expand" size={20} color={theme.color.textPrimary} />}
            accessibilityLabel={t('map.fullscreen')}
            variant="solid"
            onPress={() => setIsMapFullscreen(true)}
          />
        </View>
      ) : null}
      {hasMapboxToken ? (
        <View pointerEvents="box-none" style={styles.reportFabWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('nav.report')}
            onPress={() => navigation.navigate('Public', { screen: 'Report' })}
            style={({ pressed }) => [styles.reportFab, pressed && styles.reportFabPressed]}
          >
            <Ionicons name="warning" size={18} color={theme.color.textInverse} />
            <Text style={styles.reportFabLabel}>{t('nav.report')}</Text>
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
            <Ionicons name="close" size={20} color={theme.color.textPrimary} />
          </Pressable>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showConsent}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConsent(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={() => setShowConsent(false)}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, theme.space[4]) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('behaviour.title')}</Text>
          <Text style={styles.sheetBody}>{t('behaviour.consent')}</Text>
          <Button
            label={t('behaviour.acceptConsent')}
            onPress={acceptTripConsent}
            fullWidth
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            onPress={() => setShowConsent(false)}
            fullWidth
          />
        </View>
      </Modal>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={scrollEnabled}
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
          styles.screenContent,
          { paddingHorizontal: contentPadding, paddingBottom: theme.space[8] },
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
        <View style={styles.statusBlock}>
          {statusNotice ? (
            <AlertBanner
              title={statusNotice.title}
              message={statusNotice.message}
              variant={statusNotice.variant}
            />
          ) : null}
          {weather || mlPredictions[0] ? (
            <View style={styles.chipRow}>
              {weather ? (
                <Text style={styles.statusChip}>
                  {t('map.weatherChip', {
                    temp: Math.round(weather.tempC),
                    condition: t(`weather.${weather.conditionKey}`),
                    wind: Math.round(weather.windKmh),
                  })}
                </Text>
              ) : null}
              {mlPredictions[0] ? (
                <Text style={styles.statusChip} numberOfLines={1}>
                  {t('map.mlRiskAdvisory', { version: mlPredictions[0].model_version })}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        <View
          style={[styles.mapSection, { marginHorizontal: -(contentPadding ?? 0) }]}
          onLayout={(event: any) => {
            setMapSectionHeight(event.nativeEvent.layout.height);
            setMapSectionOffsetY(event.nativeEvent.layout.y);
          }}
        >
          {mapContent}
        </View>
          <View style={styles.panel}>
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
          <View style={styles.legendStrip}>
            <View style={styles.legendItem}>
              <View style={styles.accidentMarker} />
              <Text style={styles.legendText}>{t('map.legendAccident')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.marker, styles.legendMarker]}>
                <Ionicons name="warning" size={9} color={theme.color.textInverse} />
              </View>
              <Text style={styles.legendText}>{t('nav.hotspots')}</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={[styles.severityDot, { backgroundColor: severityColors.Fatal }]} />
              <Text style={styles.legendText}>{t('options.severity.Fatal')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.severityDot, { backgroundColor: severityColors.Critical }]} />
              <Text style={styles.legendText}>{t('options.severity.Critical')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.severityDot, { backgroundColor: severityColors.Minor }]} />
              <Text style={styles.legendText}>{t('options.severity.Minor')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.severityDot, { backgroundColor: severityColors['Damage Only'] }]}
              />
              <Text style={styles.legendText}>{t('options.severity.Damage Only')}</Text>
            </View>
          </View>
          <View style={styles.panelSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>{t('map.routeTitle')}</Text>
              {routeDestination || routeQuery ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('map.routeClear')}
                  onPress={clearRoute}
                  style={styles.clearRouteButton}
                >
                  <Text style={styles.clearRouteText}>{t('map.routeClear')}</Text>
                </Pressable>
              ) : null}
            </View>
            {!routeDestination ? (
              <Text style={styles.sectionHint}>{t('map.routeHint')}</Text>
            ) : null}

            <View style={styles.searchRow}>
              <TextInput
                style={styles.routeSearchInput}
                placeholder={t('map.routeSearchPlaceholder')}
                value={routeQuery}
                onChangeText={setRouteQuery}
                placeholderTextColor={theme.color.textSecondary}
                onFocus={() => {
                  setRouteSearchFocused(true);
                  scrollRef.current?.scrollTo({
                    y: mapSectionHeight,
                    animated: true,
                  });
                }}
                onBlur={() => setRouteSearchFocused(false)}
              />
              <IconButton
                icon={<Ionicons name="map-outline" size={20} color={theme.color.textPrimary} />}
                accessibilityLabel={
                  routePickMode ? t('map.routePickActive') : t('map.routePick')
                }
                variant="solid"
                onPress={() => setRoutePickMode((prev) => !prev)}
              />
            </View>

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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('map.routeCoordinates')}
              onPress={() => setShowCoords((prev) => !prev)}
              style={styles.coordsToggle}
            >
              <Text style={styles.coordsToggleText}>{t('map.routeCoordinates')}</Text>
              <Ionicons
                name={showCoords ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.color.textSecondary}
              />
            </Pressable>

            {showCoords ? (
              <View style={styles.coordsBlock}>
                <View style={styles.routeRow}>
                  <TextInput
                    style={styles.routeInput}
                    placeholder={t('map.routeLatPlaceholder')}
                    value={routeLat}
                    onChangeText={setRouteLat}
                    keyboardType="numeric"
                    placeholderTextColor={theme.color.textSecondary}
                  />
                  <TextInput
                    style={styles.routeInput}
                    placeholder={t('map.routeLngPlaceholder')}
                    value={routeLng}
                    onChangeText={setRouteLng}
                    keyboardType="numeric"
                    placeholderTextColor={theme.color.textSecondary}
                  />
                </View>
                <Button label={t('map.routeSet')} onPress={setRoute} />
              </View>
            ) : null}

            {routeDestination ? (
              <View style={styles.routeSummary}>
                <View style={styles.routeSummaryRow}>
                  <Text style={styles.routeSummaryValue}>
                    {routeLoading
                      ? t('map.routeFinding')
                      : routeDistanceMeters != null
                        ? t('map.routeDistance', {
                            km: (routeDistanceMeters / 1000).toFixed(1),
                          })
                        : t('map.routeNoLocation')}
                  </Text>
                  {congestionLevel ? (
                    <Text style={styles.routeSummaryMeta}>
                      {t('map.routeCongestion', {
                        level: t(`congestion.${congestionLevel}`),
                      })}
                    </Text>
                  ) : null}
                </View>
                {warningHotspots.length > 0 ? (
                  <Text style={styles.routeWarnText}>
                    {t('map.routeWarningText', {
                      count: warningHotspots.length,
                      plural: warningHotspots.length === 1 ? '' : 's',
                    })}
                  </Text>
                ) : (
                  <Text style={styles.routeOkText}>{t('map.routeOk')}</Text>
                )}
                <Text style={styles.routeRiskText}>
                  {t('map.routeRiskScore', { value: routeRiskScore })}
                </Text>
              </View>
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
                        {t('map.hotspotTitle')} · {hotspot.severity_level}
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
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
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
    backgroundColor: theme.color.background,
  },
  map: {
    flex: 1,
  },
  mapStack: {
    flex: 1,
    position: 'relative',
  },
  screenContent: {
    backgroundColor: theme.color.background,
  },
  mapSectionOuter: {
    margin: theme.space[6],
    marginBottom: theme.space[4],
    padding: 1.5,
  },
  mapSectionInner: {
    padding: 0,
    overflow: 'hidden',
  },
  mapSection: {
    height: 420,
    position: 'relative',
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: theme.color.surface,
    marginBottom: theme.space[5],
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: theme.color.background,
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: theme.space[3],
    paddingTop: theme.space[2],
    paddingHorizontal: theme.space[5],
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.color.surface,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.color.border,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: theme.color.textPrimary,
  },
  sheetBody: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.color.textSecondary,
    marginBottom: theme.space[2],
  },
  fullscreenMap: {
    flex: 1,
  },
  fullscreenClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.full,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
    shadowColor: theme.elevation.raised.shadowColor,
    shadowOpacity: theme.elevation.raised.shadowOpacity,
    shadowRadius: theme.elevation.raised.shadowRadius,
    shadowOffset: theme.elevation.raised.shadowOffset,
    elevation: 3,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.color.surfaceElevated,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.color.textPrimary,
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 12,
    color: theme.color.textSecondary,
    textAlign: 'center',
  },
  panel: {
    padding: 0,
    gap: theme.space[4],
  },
  statusBlock: {
    paddingTop: theme.space[2],
    paddingBottom: theme.space[3],
    gap: theme.space[2],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
  },
  statusChip: {
    fontSize: theme.type.caption.fontSize,
    lineHeight: theme.type.caption.lineHeight,
    color: theme.color.textSecondary,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[1],
    overflow: 'hidden',
  },
  reportFab: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    paddingHorizontal: theme.space[4],
    borderRadius: theme.radius.full,
    backgroundColor: theme.color.primary,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  reportFabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: theme.space[5],
    alignItems: 'center',
    zIndex: 6,
  },
  reportFabPressed: {
    opacity: 0.9,
  },
  reportFabLabel: {
    fontSize: theme.type.label.fontSize,
    fontWeight: theme.type.label.fontWeight,
    color: theme.color.textInverse,
  },
  topBar: {
    paddingHorizontal: theme.space[6],
    paddingTop: theme.space[6],
    paddingBottom: theme.space[1],
    backgroundColor: theme.color.background,
  },
  statusRow: {
    marginTop: theme.space[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: theme.color.textSecondary,
  },
  banner: {
    marginTop: theme.space[2],
    padding: theme.space[4],
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
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.color.error,
  },
  card: {
    padding: theme.space[1],
  },
  compactCard: {
    padding: theme.space[4],
    gap: theme.space[2],
  },
  sectionHeader: {
    gap: theme.space[1],
    marginBottom: theme.space[1],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space[3],
  },
  clearRouteButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.space[2],
  },
  clearRouteText: {
    fontSize: theme.type.label.fontSize,
    fontWeight: theme.type.label.fontWeight,
    color: theme.color.primary,
  },
  sectionTitle: {
    fontSize: theme.type.label.fontSize,
    fontWeight: theme.type.label.fontWeight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: theme.color.textSecondary,
  },
  sectionHint: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
    flexShrink: 1,
  },
  legend: {
    flexDirection: 'row',
    gap: theme.space[3],
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
  },
  legendDivider: {
    width: 1,
    height: 14,
    backgroundColor: theme.color.border,
  },
  panelSection: {
    gap: theme.space[2],
  },
  sectionHeading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: theme.color.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
  },
  coordsToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    alignSelf: 'flex-start',
  },
  coordsToggleText: {
    fontSize: theme.type.label.fontSize,
    fontWeight: theme.type.label.fontWeight,
    color: theme.color.textSecondary,
  },
  coordsBlock: {
    gap: theme.space[2],
  },
  routeSummary: {
    gap: theme.space[1],
    paddingTop: theme.space[1],
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.space[3],
  },
  routeSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.textPrimary,
  },
  routeSummaryMeta: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  routeWarnText: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.warning,
  },
  routeRiskText: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  legendMarker: {
    backgroundColor: theme.color.error,
  },
  legendText: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  severityLegend: {
    marginTop: theme.space[3],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[3],
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.color.surface,
  },
  routeCard: {
    padding: theme.space[4],
  },
  routeSearchInput: {
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
  routeRow: {
    flexDirection: 'row',
    gap: theme.space[2],
  },
  routeInput: {
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
  routeActions: {
    marginTop: theme.space[2],
    flexDirection: 'row',
    gap: theme.space[2],
    flexWrap: 'wrap',
  },
  suggestionList: {
    marginTop: theme.space[3],
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.color.surface,
  },
  suggestionItem: {
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[3],
    borderBottomWidth: 1,
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
  routeHint: {
    marginTop: 8,
    fontSize: 11,
    color: theme.color.textSecondary,
  },
  routeDistance: {
    marginTop: theme.space[2],
    fontSize: 12,
    fontWeight: '600',
    color: theme.color.textPrimary,
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
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.error,
  },
  routeWarningText: {
    fontSize: 12,
    color: theme.color.error,
  },
  routeOkText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.color.success,
  },
  routeHotspotList: {
    marginTop: theme.space[1],
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
  routeHotspotRow: {
    paddingVertical: theme.space[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  routeHotspotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.space[2],
  },
  routeHotspotTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color.textPrimary,
  },
  routeHotspotMeta: {
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  routeHotspotLocation: {
    marginTop: 2,
    fontSize: theme.type.caption.fontSize,
    color: theme.color.textSecondary,
  },
  routeHotspotTapHint: {
    marginTop: 6,
    fontSize: 11,
    color: theme.color.primary,
    fontWeight: '600',
  },
  routeAlert: {
    marginTop: theme.space[3],
    padding: theme.space[3],
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.warning,
    backgroundColor: theme.color.surfaceElevated,
  },
  routeAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.warning,
  },
  routeAlertText: {
    marginTop: 4,
    fontSize: 11,
    color: theme.color.warning,
  },
  accidentMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.info,
    borderWidth: 1,
    borderColor: theme.color.surface,
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
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.full,
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.elevation.raised.shadowColor,
    shadowOpacity: theme.elevation.raised.shadowOpacity,
    shadowRadius: theme.elevation.raised.shadowRadius,
    shadowOffset: theme.elevation.raised.shadowOffset,
    elevation: 3,
  },
  locateButtonActive: {
    borderColor: theme.color.primary,
    backgroundColor: theme.color.surfaceElevated,
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
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.textPrimary,
  },
  detailClose: {
    fontSize: 13,
    color: theme.color.primary,
  },
  detailText: {
    fontSize: 13,
    color: theme.color.textSecondary,
    marginBottom: 2,
  },
  callout: {
    minWidth: 160,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
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
    borderTopColor: theme.color.surface,
    marginTop: -1,
  },
  calloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.textPrimary,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 11,
    color: theme.color.textSecondary,
  },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
