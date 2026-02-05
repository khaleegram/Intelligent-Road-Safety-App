import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import type { RootTabParamList } from '../navigation/RootNavigator';
import { storage } from '../services/storage';

export default function SettingsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const refreshCache = async () => {
    await storage.remove('hotspots_cache_v1');
    await storage.remove('accidents_cache_v1');
    Alert.alert('Cache cleared', 'Local cache cleared. Reload the map to refresh.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Settings"
        subtitle="Manage notifications and safety preferences."
      />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Language</Text>
          <Text style={styles.value}>English (default)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Cache</Text>
          <Text style={styles.value}>Offline hotspots + reports</Text>
          <Button label="Clear cache" variant="secondary" onPress={refreshCache} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Text style={styles.label}>RoadSafe MVP</Text>
          <Text style={styles.value}>Incident reporting and hotspot warnings.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="Back to map" onPress={() => navigation.navigate('Map')} />
        <Button
          label="Report incident"
          variant="secondary"
          onPress={() => navigation.navigate('Report')}
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
  },
  value: {
    fontSize: 12,
    color: '#555',
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
});
