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
import ListItem from '../components/system/ListItem';
import EmptyState from '../components/system/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { fetchAdminAlerts } from '../services/firestore';
import { fetchLocalAlerts } from '../services/localAlerts';
import type { AdminAlert, LocalAlert } from '../types';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { isAdmin } = useAdminAccess();
  const { contentPadding } = useBreakpoint();
  const styles = createStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Notifications'>>();

  const mode = route.params?.mode ?? 'public';
  const [compactBar, setCompactBar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [localAlerts, setLocalAlerts] = useState<LocalAlert[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        if (mode === 'admin' && isAdmin) {
          const items = await fetchAdminAlerts();
          if (active) setAlerts(items);
        } else {
          const items = await fetchLocalAlerts();
          if (active) setLocalAlerts(items);
        }
      } catch {
        if (active) {
          setAlerts([]);
          setLocalAlerts([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isAdmin, mode]);

  const empty = mode === 'admin' ? alerts.length === 0 : localAlerts.length === 0;

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
        contentContainerStyle={[styles.content, { paddingHorizontal: contentPadding }]}
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

        <View style={styles.resultsGroup}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.hint}>{t('notifications.loading')}</Text>
            </View>
          ) : null}

          {!loading && empty ? (
            <EmptyState
              title={t('notifications.emptyTitle')}
              reason={t('notifications.emptyReason')}
              nextStep={t('notifications.emptyNext')}
            />
          ) : null}

          {mode === 'admin'
            ? alerts.map((item, index) => (
                <View key={item.id ?? `${item.created_at}-${item.message}`}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ListItem
                    title={item.message}
                    subtitle={`${item.type} - ${item.level}`}
                    meta={item.created_at}
                  />
                </View>
              ))
            : localAlerts.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ListItem
                    title={item.title}
                    subtitle={item.message}
                    meta={item.created_at}
                  />
                </View>
              ))}
        </View>
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
      paddingBottom: theme.space[12],
    },
    headerWrap: {
      marginBottom: theme.space[2],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    card: {
      gap: theme.space[2],
    },
    resultsGroup: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space[1],
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.color.border,
      marginLeft: theme.space[2],
    },
    loadingRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[2],
    },
    hint: {
      fontSize: theme.type.body.fontSize,
      color: theme.color.textSecondary,
    },
  });
