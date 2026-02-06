import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import type { RootTabParamList } from '../navigation/RootNavigator';
import { storage } from '../services/storage';
import { type Theme, useTheme } from '../theme';

export default function SettingsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { theme, mode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  const refreshCache = async () => {
    await storage.remove('hotspots_cache_v1');
    await storage.remove('accidents_cache_v1');
    Alert.alert('Cache cleared', 'Local cache cleared. Reload the map to refresh.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        <ScreenHeader
          eyebrow="Preferences"
          title="Settings"
          subtitle="Basic preferences and data tools."
        />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Theme</Text>
            <Text style={styles.value}>
              {mode === 'light' ? 'Light mode' : 'Dark mode'}
            </Text>
            <Button
              label={mode === 'light' ? 'Switch to dark' : 'Switch to light'}
              variant="secondary"
              onPress={toggleTheme}
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Language</Text>
            <Text style={styles.value}>English (only)</Text>
          </View>
        </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Offline cache</Text>
          <Text style={styles.value}>Hotspots and reports stored locally</Text>
          <Button label="Clear cache" variant="secondary" onPress={refreshCache} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Text style={styles.label}>RoadSafe MVP</Text>
          <Text style={styles.value}>
            Incident reports, hotspot map, and route warnings.
          </Text>
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
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  value: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  });
