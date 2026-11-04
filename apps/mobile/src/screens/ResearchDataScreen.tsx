import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import OptionGrid from '../components/OptionGrid';
import SegmentedControl from '../components/SegmentedControl';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchAccidents } from '../services/firestore';
import { accidentsToCsv } from '../services/exportCsv';
import { shareCsvExport } from '../services/exportShare';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import type { AccidentRecord, AccidentSeverity } from '../types';

export default function ResearchDataScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
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
        Alert.alert(t('detail.loadFailedTitle'), t('research.empty'));
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [t]);

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
      Alert.alert(t('research.empty'), t('research.empty'));
      return;
    }
    const csv = accidentsToCsv(filtered, { includeSensitive: true });
    await shareCsvExport({
      title: t('research.title'),
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
          const shouldCompact = event.nativeEvent.contentOffset.y > theme.space[2];
          if (shouldCompact !== compactBar) {
            setCompactBar(shouldCompact);
          }
        }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.space[6] + insets.bottom },
        ]}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow={t('research.eyebrow')}
            title={t('research.title')}
            subtitle={t('research.subtitle')}
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
          <View style={styles.group}>
            <Text style={styles.sectionHeading}>{t('common.adminRequired')}</Text>
            <Button
              label={t('common.back')}
              variant="secondary"
              onPress={() => navigation.goBack()}
            />
          </View>
        ) : null}
        {!authLoading && !isAdmin ? null : (
          <>
            <View style={styles.filters}>
              <OptionGrid
                columns={3}
                accessibilityLabel={t('research.title')}
                value={severityFilter}
                onChange={(value) =>
                  setSeverityFilter(value as AccidentSeverity | 'All')
                }
                options={[
                  { value: 'All', label: t('common.all') },
                  { value: 'Fatal', label: t('options.severity.Fatal') },
                  { value: 'Critical', label: t('options.severity.Critical') },
                  { value: 'Minor', label: t('options.severity.Minor') },
                  { value: 'Damage Only', label: t('options.severity.Damage Only') },
                ]}
              />
              <SegmentedControl
                accessibilityLabel={t('research.title')}
                value={String(daysFilter)}
                onChange={(value) =>
                  setDaysFilter(
                    value === 'All' ? 'All' : (Number(value) as 1 | 7 | 30)
                  )
                }
                options={[
                  { value: 'All', label: t('common.all') },
                  { value: '1', label: '24h' },
                  { value: '7', label: '7d' },
                  { value: '30', label: '30d' },
                ]}
              />
              <TextInput
                style={styles.input}
                placeholder={t('search.placeholder')}
                placeholderTextColor={theme.color.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
              />
              <Button
                label={t('research.export')}
                onPress={exportCsv}
                disabled={filtered.length === 0}
                fullWidth
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>
                {filtered.length} · {t('nav.reports')}
              </Text>
              {loading ? <Text style={styles.muted}>{t('research.loading')}</Text> : null}
              {!loading && filtered.length === 0 ? (
                <Text style={styles.muted}>{t('research.empty')}</Text>
              ) : null}
              {!loading && filtered.length > 0 ? (
                <View style={styles.group}>
                  {filtered.slice(0, 50).map((item, index) => (
                    <View key={item.id ?? item.request_id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <View style={styles.row}>
                        <Text style={styles.rowTitle}>
                          {item.severity} · {item.road_type}
                        </Text>
                        <Text style={styles.muted}>
                          {item.created_at ?? item.timestamp}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
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
      backgroundColor: theme.color.background,
    },
    content: {
      padding: theme.space[4],
      gap: theme.space[4],
    },
    headerWrap: {
      marginBottom: theme.space[1],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    filters: {
      gap: theme.space[3],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    section: {
      gap: theme.space[2],
    },
    sectionHeading: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: theme.color.textPrimary,
    },
    group: {
      gap: theme.space[2],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.color.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.color.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: theme.color.textSecondary,
    },
    card: {
      gap: theme.space[4],
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.color.textPrimary,
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
      borderColor: theme.color.border,
      borderRadius: theme.radius.sm,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: theme.type.body.fontSize,
      color: theme.color.textPrimary,
      backgroundColor: theme.color.surfaceElevated,
    },
    row: {
      marginTop: theme.space[2],
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.color.surfaceElevated,
      gap: 4,
    },
    rowTitle: {
      fontSize: 12,
      color: theme.color.textPrimary,
      fontWeight: '600',
    },
    muted: {
      fontSize: 11,
      color: theme.color.textSecondary,
    },
  });
