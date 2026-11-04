import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
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
            eyebrow={t('feedback.eyebrow')}
            title={t('feedback.title')}
            subtitle={t('feedback.subtitle')}
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

        <View style={styles.group}>
          <InputField
            label={t('feedback.message')}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            style={styles.messageInput}
          />

          <Text style={styles.label}>{t('feedback.rating')}</Text>
          <View style={styles.starRow}>
            {RATINGS.map((value) => {
              const active = rating != null && value <= rating;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={String(value)}
                  accessibilityState={{ selected: rating === value }}
                  onPress={() => setRating(value)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={active ? 'star' : 'star-outline'}
                    size={30}
                    color={active ? theme.color.primary : theme.color.textSecondary}
                  />
                </Pressable>
              );
            })}
          </View>

          <Button
            label={t('feedback.submit')}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
          />
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
    messageInput: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    label: {
      fontSize: theme.type.body.fontSize,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    starRow: {
      flexDirection: 'row',
      gap: theme.space[2],
    },
    starButton: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.color.surfaceElevated,
    },
    ratingRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.space[2],
    },
  });
