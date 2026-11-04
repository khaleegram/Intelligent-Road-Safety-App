import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import educationEn from '../content/education/en.json';
import educationHa from '../content/education/ha.json';
import educationYo from '../content/education/yo.json';
import educationIg from '../content/education/ig.json';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import { storage } from '../services/storage';
import type { EducationArticle } from '../types';
import { type Theme, useTheme } from '../theme';

const READ_KEY = 'education_read_v1';

const packs: Record<'en' | 'ha' | 'yo' | 'ig', EducationArticle[]> = {
  en: educationEn as EducationArticle[],
  ha: educationHa as EducationArticle[],
  yo: educationYo as EducationArticle[],
  ig: educationIg as EducationArticle[],
};

export default function EducationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const { isAdmin } = useAdminAccess();
  const { contentPadding } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  const [compactBar, setCompactBar] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const articles = useMemo(() => packs[language] ?? packs.en, [language]);

  const loadRead = useCallback(async () => {
    setReadIds(await storage.get<string[]>(READ_KEY, []));
  }, []);

  useEffect(() => {
    loadRead();
  }, [loadRead]);

  const markRead = async (id: string) => {
    const next = readIds.includes(id) ? readIds : [...readIds, id];
    setReadIds(next);
    await storage.set(READ_KEY, next);
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
            eyebrow={t('education.eyebrow')}
            title={t('education.title')}
            subtitle={t('education.subtitle')}
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

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>{t('education.read')}</Text>
            <Text style={styles.progressValue}>
              {readIds.length}/{articles.length}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    articles.length > 0
                      ? Math.round((readIds.length / articles.length) * 100)
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.group}>
          {articles.map((article, index) => {
            const isRead = readIds.includes(article.id);
            const expanded = expandedId === article.id;

            return (
              <View key={article.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`${article.title}, ${t(`education.category.${article.category}`)}`}
                  onPress={() => setExpandedId(expanded ? null : article.id)}
                  style={({ pressed }) => [styles.articleRow, pressed && styles.pressed]}
                >
                  <View style={styles.articleInfo}>
                    <Text style={styles.articleCategory}>
                      {t(`education.category.${article.category}`)}
                    </Text>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                  </View>
                  {isRead ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={theme.color.success}
                    />
                  ) : (
                    <View style={styles.unreadDot} />
                  )}
                </Pressable>
                {expanded ? (
                  <View style={styles.expanded}>
                    <Text style={styles.body}>{article.body}</Text>
                    {!isRead ? (
                      <Button
                        label={t('education.markRead')}
                        variant="secondary"
                        size="sm"
                        onPress={() => markRead(article.id)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
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
    progressCard: {
      gap: theme.space[2],
      padding: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surface,
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    progressValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.color.primary,
    },
    progressTrack: {
      height: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.surfaceElevated,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.primary,
    },
    articleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[3],
      paddingHorizontal: theme.space[2],
    },
    pressed: {
      opacity: 0.75,
    },
    articleInfo: {
      flex: 1,
      gap: 2,
    },
    articleCategory: {
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
    articleTitle: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      color: theme.color.textPrimary,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.primary,
    },
    expanded: {
      gap: theme.space[3],
      paddingHorizontal: theme.space[2],
      paddingBottom: theme.space[4],
    },
    group: {
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
    bodyWrap: {
      gap: theme.space[2],
    },
    body: {
      fontSize: theme.type.body.fontSize,
      color: theme.color.textSecondary,
      lineHeight: 20,
    },
  });
