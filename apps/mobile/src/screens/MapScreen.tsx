import MapboxGL from '@rnmapbox/maps';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchHotspots } from '../services/firestore';
import type { HotspotRecord } from '../types';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

const severityColors: Record<HotspotRecord['severity_level'], string> = {
  Fatal: '#D7263D',
  Critical: '#1B9AAA',
  Minor: '#F4D35E',
  'Damage Only': '#111111',
};

export default function MapScreen() {
  const navigation = useNavigation();
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mapboxToken) {
      MapboxGL.setAccessToken(mapboxToken);
    }
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

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map}>
        <MapboxGL.Camera
          zoomLevel={12}
          centerCoordinate={[3.3792, 6.5244]}
          animationMode="flyTo"
        />
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
      <View style={styles.overlay}>
        <Text style={styles.title}>Map (placeholder)</Text>
        {loading ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" />
            <Text style={styles.statusText}>Loading hotspots…</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable
            style={styles.button}
            onPress={() => navigation.navigate('Report' as never)}
          >
            <Text style={styles.buttonText}>Report</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => navigation.navigate('Settings' as never)}
          >
            <Text style={styles.buttonText}>Settings</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#555',
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
  button: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
