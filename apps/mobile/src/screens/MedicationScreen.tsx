import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import IslandBar from '../components/IslandBar';
import InputField from '../components/system/InputField';
import EmptyState from '../components/system/EmptyState';
import medications from '../content/medications.json';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import type { MedicationEntry } from '../types';
import { type Theme, useTheme } from '../theme';

const entries = medications as MedicationEntry[];

export default function MedicationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const { isAdmin } = useAdminAccess();
  const { contentPadding } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  const [compactBar, setCompactBar] = useState(false);
  const [query, setQuery] = useState('');

  const adviceKey = `advice_${language}` as keyof MedicationEntry;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      entry.names.some((name) => name.toLowerCase().includes(q))
    );
  }, [query]);

  const levelLabel = (level: MedicationEntry['level']) => {
    if (level === 'safe') return t('medication.safe');
    if (level === 'caution') return t('medication.caution');
    return t('medication.avoid');
  };

  const levelColor = (level: MedicationEntry['level']) => {
    if (level === 'safe') return theme.color.success;
    if (level === 'caution') return theme.color.warning;
    return theme.color.error;
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
          { paddingHorizontal: contentPadding, paddingBottom: theme.space[6] + insets.bottom },
        ]}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow={t('medication.eyebrow')}
            title={t('medication.title')}
            subtitle={t('medication.subtitle')}
            mode="public"
            compact={compactBar}
            isAdmin={isAdmin}
            onBack={() => navigation.goBack()}
            onToggle={(next) => {
              if (next === 'admin') {
                navigation.navigate('Admin', undefined);
              }
            }}
          />
        </View>

        <View style={styles.searchGroup}>
          <InputField
            label={t('nav.search')}
            placeholder={t('medication.searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          <View style={styles.legendRow}>
            {(['safe', 'caution', 'avoid'] as const).map((level) => (
              <View key={level} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: levelColor(level) }]}
                />
                <Text style={styles.legendText}>{levelLabel(level)}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.disclaimer}>{t('medication.disclaimer')}</Text>

        {filtered.length === 0 ? (
          <EmptyState
            title={t('medication.empty')}
            reason={t('medication.searchPlaceholder')}
            nextStep={t('common.retry')}
          />
        ) : (
          <View style={styles.listGroup}>
            {filtered.map((entry, index) => (
              <View key={entry.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.entryRow}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryName}>{entry.names[0]}</Text>
                    <View style={styles.levelBadge}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: levelColor(entry.level) },
                        ]}
                      />
                      <Text style={styles.levelText}>{levelLabel(entry.level)}</Text>
                    </View>
                  </View>
                  {entry.names.length > 1 ? (
                    <Text style={styles.entryAliases}>
                      {entry.names.slice(1).join(' · ')}
                    </Text>
                  ) : null}
                  <Text style={styles.entryAdvice}>
                    {String(entry[adviceKey] ?? entry.advice_en)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
      gap: theme.space[3],
    },
    headerWrap: {
      marginBottom: theme.space[2],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    card: {
      gap: theme.space[2],
    },
    searchGroup: {
      gap: theme.space[3],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.space[3],
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[1],
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: theme.radius.full,
    },
    legendText: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    listGroup: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
      paddingHorizontal: theme.space[2],
    },
    entryRow: {
      gap: theme.space[1],
      paddingVertical: theme.space[4],
      paddingHorizontal: theme.space[2],
    },
    entryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[3],
    },
    entryName: {
      flex: 1,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      color: theme.color.textPrimary,
    },
    levelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[1],
      paddingHorizontal: theme.space[2],
      paddingVertical: 3,
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.surfaceElevated,
    },
    levelText: {
      fontSize: theme.type.caption.fontSize,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    entryAliases: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    entryAdvice: {
      marginTop: theme.space[1],
      fontSize: 14,
      lineHeight: 21,
      color: theme.color.textSecondary,
    },
    group: {
      gap: theme.space[3],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.color.border,
      marginVertical: theme.space[2],
    },
    disclaimer: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    adviceLabel: {
      fontSize: theme.type.caption.fontSize,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    advice: {
      fontSize: theme.type.body.fontSize,
      color: theme.color.textSecondary,
      lineHeight: 20,
    },
  });
