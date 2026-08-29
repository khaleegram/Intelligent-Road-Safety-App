import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import InputField from '../components/system/InputField';
import ListItem from '../components/system/ListItem';
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
          { paddingHorizontal: contentPadding, paddingBottom: theme.spacing.lg + insets.bottom },
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
            onToggle={(next) => {
              if (next === 'admin') {
                navigation.navigate('Admin', undefined);
              }
            }}
          />
        </View>

        <IslandCard style={styles.card}>
          <Text style={styles.disclaimer}>{t('medication.disclaimer')}</Text>
          <InputField
            label={t('medication.searchPlaceholder')}
            placeholder={t('medication.searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </IslandCard>

        {filtered.length === 0 ? (
          <EmptyState
            title={t('medication.empty')}
            reason={t('medication.searchPlaceholder')}
            nextStep={t('common.retry')}
          />
        ) : (
          filtered.map((entry) => (
            <IslandCard key={entry.id} style={styles.card}>
              <ListItem
                title={entry.names[0]}
                subtitle={entry.names.slice(1).join(', ')}
                meta={levelLabel(entry.level)}
              />
              <Text style={styles.adviceLabel}>{t('medication.advice')}</Text>
              <Text style={styles.advice}>
                {String(entry[adviceKey] ?? entry.advice_en)}
              </Text>
            </IslandCard>
          ))
        )}

        <Button label={t('common.back')} variant="secondary" onPress={() => navigation.goBack()} />
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
      padding: theme.tokens.spacing[4],
      gap: theme.tokens.spacing[3],
    },
    headerWrap: {
      marginBottom: theme.tokens.spacing[2],
      backgroundColor: theme.tokens.color.background,
      paddingBottom: theme.tokens.spacing[2],
    },
    card: {
      gap: theme.tokens.spacing[2],
    },
    disclaimer: {
      fontSize: theme.tokens.typography.fontSize.xs,
      color: theme.tokens.color.textSecondary,
    },
    adviceLabel: {
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.semibold,
      color: theme.tokens.color.textPrimary,
    },
    advice: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textSecondary,
      lineHeight: 20,
    },
  });
