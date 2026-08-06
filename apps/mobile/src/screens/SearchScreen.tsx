import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import InputField from '../components/system/InputField';
import ListItem from '../components/system/ListItem';
import EmptyState from '../components/system/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchGeocodeSuggestions, type GeocodeSuggestion } from '../services/geocoding';
import { mapboxToken } from '../config/env';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import { useAdminAccess } from '../hooks/useAdminAccess';

export default function SearchScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { isAdmin } = useAdminAccess();
  const styles = createStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Search'>>();

  const mode = route.params?.mode ?? 'public';
  const [compactBar, setCompactBar] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodeSuggestion[]>([]);

  useEffect(() => {
    if (query.trim().length < 3 || !mapboxToken) {
      setResults([]);
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetchGeocodeSuggestions(query, mapboxToken, 8, undefined, 'ng')
        .then((items) => {
          if (active) {
            setResults(items);
          }
        })
        .catch(() => {
          if (active) {
            setResults([]);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 320);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

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
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerWrap}>
          <IslandBar
            eyebrow={t('search.eyebrow')}
            title={t('search.title')}
            subtitle={t('search.subtitle')}
            mode={mode}
            compact={compactBar}
            isAdmin={isAdmin}
            onToggle={(next) => {
              if (next === 'public') {
                navigation.navigate('Public', { screen: 'Map' });
                return;
              }
              navigation.navigate('Admin', undefined);
            }}
          />
        </View>

        <IslandCard style={styles.card}>
          <InputField
            label={t('search.fieldLabel')}
            placeholder={t('search.placeholder')}
            value={query}
            onChangeText={setQuery}
          />
        </IslandCard>

        <IslandCard style={styles.card}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.hint}>{t('search.loading')}</Text>
            </View>
          ) : null}

          {!loading && results.length === 0 ? (
            <EmptyState
              title={t('search.emptyTitle')}
              reason={t('search.emptyReason')}
              nextStep={t('search.emptyNext')}
            />
          ) : null}

          {results.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate('Public', { screen: 'Map' })}
            >
              <ListItem
                title={item.name}
                subtitle={item.place_name}
                meta={`${item.center[1].toFixed(5)}, ${item.center[0].toFixed(5)}`}
              />
            </Pressable>
          ))}
        </IslandCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.color.background,
    },
    content: {
      padding: theme.tokens.spacing[4],
      gap: theme.tokens.spacing[4],
      paddingBottom: theme.tokens.spacing[12],
    },
    headerWrap: {
      marginBottom: theme.tokens.spacing[2],
      backgroundColor: theme.tokens.color.background,
      paddingBottom: theme.tokens.spacing[2],
    },
    card: {
      gap: theme.tokens.spacing[2],
    },
    loadingRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.tokens.spacing[2],
    },
    hint: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textSecondary,
    },
  });
