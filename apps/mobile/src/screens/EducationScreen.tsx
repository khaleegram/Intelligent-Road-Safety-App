import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import ListItem from '../components/system/ListItem';
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
            eyebrow={t('education.eyebrow')}
            title={t('education.title')}
            subtitle={t('education.subtitle')}
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

        {articles.map((article) => {
          const isRead = readIds.includes(article.id);
          const expanded = expandedId === article.id;

          return (
            <IslandCard key={article.id} style={styles.card}>
              <ListItem
                title={article.title}
                subtitle={t(`education.category.${article.category}`)}
                meta={isRead ? t('education.read') : t('education.unread')}
                onPress={() => setExpandedId(expanded ? null : article.id)}
              />
              {expanded ? (
                <View style={styles.bodyWrap}>
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
            </IslandCard>
          );
        })}

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
    bodyWrap: {
      gap: theme.tokens.spacing[2],
    },
    body: {
      fontSize: theme.tokens.typography.fontSize.sm,
      color: theme.tokens.color.textSecondary,
      lineHeight: 20,
    },
  });
