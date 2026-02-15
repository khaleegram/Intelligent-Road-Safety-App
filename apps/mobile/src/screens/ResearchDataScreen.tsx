import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchAccidents } from '../services/firestore';
import { accidentsToCsv } from '../services/exportCsv';
import { shareCsvExport } from '../services/exportShare';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, AccidentSeverity } from '../types';

export default function ResearchDataScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAdmin, loading: authLoading } = useAdminAccess();
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<AccidentSeverity | 'All'>('All');
  const [daysFilter, setDaysFilter] = useState<1 | 7 | 30 | 'All'>('All');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchAccidents()
      .then((data) => {
        if (!mounted) return;
        setAccidents(data);
      })
      .catch((error) => {
        console.error(error);
        Alert.alert('Load failed', 'Unable to load research dataset.');
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return accidents.filter((item) => {
      const severityMatch = severityFilter === 'All' ? true : item.severity === severityFilter;
      let daysMatch = true;
      if (daysFilter !== 'All') {
        const created = Date.parse(item.created_at ?? item.timestamp);
        daysMatch = !Number.isNaN(created) && created >= Date.now() - daysFilter * 24 * 60 * 60 * 1000;
      }
      const text = `${item.road_type} ${item.weather}`.toLowerCase();
      const textMatch = searchText.trim().length === 0 ? true : text.includes(searchText.toLowerCase());
      return severityMatch && daysMatch && textMatch;
    });
  }, [accidents, severityFilter, daysFilter, searchText]);

  const exportCsv = async () => {
    if (filtered.length === 0) {
      Alert.alert('No rows', 'There is no data to export for current filters.');
      return;
    }
    const csv = accidentsToCsv(filtered, { includeSensitive: true });
    await shareCsvExport({
      title: 'Research dataset CSV',
      filePrefix: 'research-dataset',
      csv,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        {!authLoading && !isAdmin ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Access denied</Text>
            <Text style={styles.muted}>Admin access is required for research exports.</Text>
            <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        ) : null}
        {!authLoading && !isAdmin ? null : (
          <>
        <Text style={styles.title}>Research Data View</Text>
        <Text style={styles.subtitle}>
          Filter accident reports and export CSV for approved analysis.
        </Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filterRow}>
            {(['All', 'Fatal', 'Critical', 'Minor', 'Damage Only'] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.chip, severityFilter === value && styles.chipActive]}
                onPress={() => setSeverityFilter(value)}
              >
                <Text style={[styles.chipText, severityFilter === value && styles.chipTextActive]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.filterRow}>
            {(['All', 1, 7, 30] as const).map((value) => (
              <Pressable
                key={String(value)}
                style={[styles.chip, daysFilter === value && styles.chipActive]}
                onPress={() => setDaysFilter(value)}
              >
                <Text style={[styles.chipText, daysFilter === value && styles.chipTextActive]}>
                  {value === 'All' ? 'All days' : value === 1 ? '24h' : `${value}d`}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Search road/weather text"
            placeholderTextColor={theme.colors.text}
            value={searchText}
            onChangeText={setSearchText}
          />
          <Button label="Export CSV" onPress={exportCsv} disabled={filtered.length === 0} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rows ({filtered.length})</Text>
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!loading && filtered.length === 0 ? <Text style={styles.muted}>No rows match filters.</Text> : null}
          {filtered.slice(0, 50).map((item) => (
            <View key={item.id ?? item.request_id} style={styles.row}>
              <Text style={styles.rowTitle}>{item.severity} - {item.road_type}</Text>
              <Text style={styles.muted}>{item.created_at ?? item.timestamp}</Text>
            </View>
          ))}
        </View>

        <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
          </>
        )}
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
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    card: {
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: theme.colors.surfaceAlt,
    },
    chipActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
    },
    chipText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    chipTextActive: {
      color: theme.colors.bg,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 12,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceAlt,
    },
    row: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 4,
    },
    rowTitle: {
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: '600',
    },
    muted: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
  });
