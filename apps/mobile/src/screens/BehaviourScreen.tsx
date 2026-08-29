import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import ToggleSwitch from '../components/system/ToggleSwitch';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  endTripMonitoring,
  getConsent,
  getLastTrip,
  isTripActive,
  setConsent,
  startTripMonitoring,
} from '../services/behaviour';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import type { BehaviourTrip } from '../types';
import { type Theme, useTheme } from '../theme';

export default function BehaviourScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { isAdmin } = useAdminAccess();
  const { contentPadding } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  const [compactBar, setCompactBar] = useState(false);
  const [consent, setConsentState] = useState(false);
  const [tripActive, setTripActive] = useState(false);
  const [lastTrip, setLastTrip] = useState<BehaviourTrip | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setConsentState(await getConsent());
    setTripActive(isTripActive());
    setLastTrip(await getLastTrip());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleConsent = async (value: boolean) => {
    await setConsent(value);
    setConsentState(value);
    if (!value) {
      setTripActive(false);
    }
  };

  const handleStartTrip = async () => {
    if (!consent) {
      Alert.alert(t('common.warning'), t('behaviour.noConsent'));
      return;
    }
    setBusy(true);
    try {
      const started = await startTripMonitoring();
      if (!started) {
        Alert.alert(t('common.warning'), t('sos.locationMissing'));
        return;
      }
      setTripActive(true);
    } finally {
      setBusy(false);
    }
  };

  const handleEndTrip = async () => {
    setBusy(true);
    try {
      const trip = await endTripMonitoring();
      setTripActive(false);
      if (trip) {
        setLastTrip(trip);
        Alert.alert(t('common.ok'), t('behaviour.tripSaved'));
      }
    } finally {
      setBusy(false);
    }
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
            eyebrow={t('behaviour.eyebrow')}
            title={t('behaviour.title')}
            subtitle={t('behaviour.subtitle')}
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
          <View style={styles.consentRow}>
            <Text style={styles.consentText}>{t('behaviour.consent')}</Text>
            <ToggleSwitch
              value={consent}
              onValueChange={handleConsent}
              accessibilityLabel={t('behaviour.consent')}
            />
          </View>
          {!consent ? (
            <Button
              label={t('behaviour.acceptConsent')}
              variant="secondary"
              onPress={() => handleConsent(true)}
            />
          ) : (
            <Button
              label={t('behaviour.revokeConsent')}
              variant="ghost"
              onPress={() => handleConsent(false)}
            />
          )}
        </IslandCard>

        <IslandCard style={styles.card}>
          {tripActive ? (
            <Text style={styles.active}>{t('behaviour.active')}</Text>
          ) : null}
          {!tripActive ? (
            <Button
              label={t('behaviour.startTrip')}
              onPress={handleStartTrip}
              disabled={!consent || busy}
            />
          ) : (
            <Button
              label={t('behaviour.endTrip')}
              onPress={handleEndTrip}
              disabled={busy}
            />
          )}
        </IslandCard>

        {lastTrip ? (
          <IslandCard style={styles.card}>
            <Text style={styles.stat}>
              {t('behaviour.score', { score: lastTrip.score })}
            </Text>
            <Text style={styles.stat}>
              {t('behaviour.harsh', { count: lastTrip.harsh_events })}
            </Text>
            <Text style={styles.stat}>
              {t('behaviour.distance', {
                km: (lastTrip.distance_m / 1000).toFixed(1),
              })}
            </Text>
          </IslandCard>
        ) : null}

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
      gap: theme.tokens.spacing[4],
    },
    headerWrap: {
      marginBottom: theme.tokens.spacing[2],
      backgroundColor: theme.tokens.color.background,
      paddingBottom: theme.tokens.spacing[2],
    },
    card: {
      gap: theme.tokens.spacing[2],
    },
    consentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.tokens.spacing[2],
    },
    consentText: {
      flex: 1,
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textSecondary,
    },
    active: {
      fontSize: theme.tokens.typography.fontSize.sm,
      fontWeight: theme.tokens.typography.fontWeight.semibold,
      color: theme.tokens.color.primary,
    },
    stat: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textPrimary,
    },
  });
