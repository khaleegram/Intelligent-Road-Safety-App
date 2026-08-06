import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import ListItem from '../components/system/ListItem';
import EmptyState from '../components/system/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchAdminAlerts } from '../services/firestore';
import type { AdminAlert } from '../types';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import { useAdminAccess } from '../hooks/useAdminAccess';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { isAdmin } = useAdminAccess();
  const styles = createStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Notifications'>>();

  const mode = route.params?.mode ?? 'public';
  const [compactBar, setCompactBar] = useState(false);
  const [loading, setLoading] = useState(mode === 'admin');
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);

  useEffect(() => {
    if (mode !== 'admin' || !isAdmin) {
      setLoading(false);
      setAlerts([]);
      return;
    }

    let active = true;
    fetchAdminAlerts()
      .then((items) => {
        if (active) {
          setAlerts(items);
        }
      })
      .catch(() => {
        if (active) {
          setAlerts([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin, mode]);

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
            eyebrow={t('notifications.eyebrow')}
            title={t('notifications.title')}
            subtitle={t('notifications.subtitle')}
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
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.hint}>{t('notifications.loading')}</Text>
            </View>
          ) : null}

          {!loading && alerts.length === 0 ? (
            <EmptyState
              title={t('notifications.emptyTitle')}
              reason={t('notifications.emptyReason')}
              nextStep={t('notifications.emptyNext')}
            />
          ) : null}

          {alerts.map((item) => (
            <ListItem
              key={item.id ?? `${item.created_at}-${item.message}`}
              title={item.message}
              subtitle={`${item.type} - ${item.level}`}
              meta={item.created_at}
            />
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
