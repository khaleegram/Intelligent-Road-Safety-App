import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import InputField from '../components/system/InputField';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { submitFeedback } from '../services/feedback';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';

const RATINGS = [1, 2, 3, 4, 5] as const;

export default function FeedbackScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const { isAdmin } = useAdminAccess();
  const { contentPadding } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  const [compactBar, setCompactBar] = useState(false);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert(t('common.warning'), t('feedback.required'));
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        message: message.trim(),
        rating,
        locale: language,
      });
      setMessage('');
      setRating(undefined);
      Alert.alert(t('common.ok'), t('feedback.submitted'));
    } catch {
      Alert.alert(t('common.warning'), t('feedback.failed'));
    } finally {
      setSubmitting(false);
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
            eyebrow={t('feedback.eyebrow')}
            title={t('feedback.title')}
            subtitle={t('feedback.subtitle')}
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
          <InputField
            label={t('feedback.message')}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            style={styles.messageInput}
          />

          <Text style={styles.label}>{t('feedback.rating')}</Text>
          <View style={styles.ratingRow}>
            {RATINGS.map((value) => (
              <Button
                key={value}
                label={String(value)}
                size="sm"
                variant={rating === value ? 'primary' : 'secondary'}
                onPress={() => setRating(value)}
              />
            ))}
          </View>

          <Button
            label={t('feedback.submit')}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </IslandCard>

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
    messageInput: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    label: {
      fontSize: theme.tokens.typography.fontSize.sm,
      fontWeight: theme.tokens.typography.fontWeight.semibold,
      color: theme.tokens.color.textPrimary,
    },
    ratingRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.tokens.spacing[2],
    },
  });
