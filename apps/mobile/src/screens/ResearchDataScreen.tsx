import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import GradientChip from '../components/GradientChip';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
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
  const [compactBar, setCompactBar] = useState(false);

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
        stickyHeaderIndices={[0]}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const shouldCompact = event.nativeEvent.contentOffset.y > theme.tokens.spacing[2];
          if (shouldCompact !== compactBar) {
            setCompactBar(shouldCompact);
          }
        }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow="Research"
            title="Research data"
            subtitle="Filter and export datasets"
            mode="admin"
            compact={compactBar}
            isAdmin={isAdmin}
            onToggle={(next) => {
              if (next === 'public') {
                navigation.navigate('Public', { screen: 'Map' });
              }
            }}
          />
        </View>
        {!authLoading && !isAdmin ? (
          <IslandCard style={styles.card}>
            <Text style={styles.sectionTitle}>Access denied</Text>
            <Text style={styles.muted}>Admin access is required for research exports.</Text>
            <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
          </IslandCard>
        ) : null}
        {!authLoading && !isAdmin ? null : (
          <>
        <Text style={styles.title}>Research Data View</Text>
        <Text style={styles.subtitle}>
          Filter accident reports and export CSV for approved analysis.
        </Text>
        <IslandCard style={styles.card}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filterRow}>
            {(['All', 'Fatal', 'Critical', 'Minor', 'Damage Only'] as const).map((value) => (
              <GradientChip
                key={value}
                style={styles.chip}
                active={severityFilter === value}
                label={value}
                onPress={() => setSeverityFilter(value)}
              />
            ))}
          </View>
          <View style={styles.filterRow}>
            {(['All', 1, 7, 30] as const).map((value) => (
              <GradientChip
                key={String(value)}
                style={styles.chip}
                active={daysFilter === value}
                label={value === 'All' ? 'All days' : value === 1 ? '24h' : `${value}d`}
                onPress={() => setDaysFilter(value)}
              />
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Search road/weather text"
            placeholderTextColor={theme.tokens.color.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          <Button label="Export CSV" onPress={exportCsv} disabled={filtered.length === 0} />
        </IslandCard>

        <IslandCard style={styles.card}>
          <Text style={styles.sectionTitle}>Rows ({filtered.length})</Text>
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!loading && filtered.length === 0 ? <Text style={styles.muted}>No rows match filters.</Text> : null}
          {filtered.slice(0, 50).map((item) => (
            <View key={item.id ?? item.request_id} style={styles.row}>
              <Text style={styles.rowTitle}>{item.severity} - {item.road_type}</Text>
              <Text style={styles.muted}>{item.created_at ?? item.timestamp}</Text>
            </View>
          ))}
        </IslandCard>

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
      gap: theme.spacing.md,
    },
    headerWrap: {
      marginBottom: theme.tokens.spacing[2],
      backgroundColor: theme.tokens.color.background,
      paddingBottom: theme.tokens.spacing[2],
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
      gap: theme.spacing.md,
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
      flexGrow: 0,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.colors.text,
      backgroundColor: theme.tokens.color.surfaceElevated,
    },
    row: {
      marginTop: theme.tokens.spacing[2],
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      borderRadius: theme.tokens.radius.md,
      backgroundColor: theme.tokens.color.surfaceElevated,
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
