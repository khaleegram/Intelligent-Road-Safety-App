import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import StatTile from '../components/StatTile';
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
            eyebrow={t('behaviour.eyebrow')}
            title={t('behaviour.title')}
            subtitle={t('behaviour.subtitle')}
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

        <View style={styles.hero}>
          <Text
            style={[styles.heroValue, tripActive && { color: theme.color.primary }]}
          >
            {tripActive ? t('behaviour.recording') : t('behaviour.notRecording')}
          </Text>
          <Button
            label={tripActive ? t('behaviour.endTrip') : t('behaviour.startTrip')}
            variant={tripActive ? 'destructive' : 'primary'}
            onPress={tripActive ? handleEndTrip : handleStartTrip}
            loading={busy}
            disabled={!tripActive && !consent}
            fullWidth
          />
          {!consent ? (
            <Text style={styles.heroHint}>{t('behaviour.noConsent')}</Text>
          ) : null}
        </View>

        <View style={styles.group}>
          <View style={styles.consentRow}>
            <Text style={styles.consentText}>{t('behaviour.consent')}</Text>
            <ToggleSwitch
              value={consent}
              onValueChange={handleConsent}
              accessibilityLabel={t('behaviour.consent')}
            />
          </View>
        </View>

        {lastTrip ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>{t('behaviour.lastTrip')}</Text>
            <View style={styles.statsRow}>
              <StatTile label={t('behaviour.scoreLabel')} value={String(lastTrip.score)} />
              <StatTile
                label={t('behaviour.harshLabel')}
                value={String(lastTrip.harsh_events)}
              />
              <StatTile
                label={t('behaviour.distanceLabel')}
                value={`${(lastTrip.distance_m / 1000).toFixed(1)} km`}
              />
            </View>
          </View>
        ) : null}
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
      marginBottom: theme.space[2],
      backgroundColor: theme.color.background,
      paddingBottom: theme.space[2],
    },
    card: {
      gap: theme.space[2],
    },
    group: {
      gap: theme.space[3],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    hero: {
      gap: theme.space[3],
      padding: theme.space[5],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    heroValue: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
      color: theme.color.textPrimary,
    },
    heroHint: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
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
    statsRow: {
      flexDirection: 'row',
      gap: theme.space[2],
    },
    consentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[2],
    },
    consentText: {
      flex: 1,
      fontSize: theme.type.body.fontSize,
      color: theme.color.textSecondary,
    },
    active: {
      fontSize: theme.type.body.fontSize,
      fontWeight: '600',
      color: theme.color.primary,
    },
    hint: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    stat: {
      fontSize: theme.type.body.fontSize,
      color: theme.color.textPrimary,
    },
  });
