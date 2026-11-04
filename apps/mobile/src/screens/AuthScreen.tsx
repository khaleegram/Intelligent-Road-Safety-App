import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import Button from '../components/Button';
import IslandCard from '../components/IslandCard';
import SegmentedControl from '../components/SegmentedControl';
import AlertBanner from '../components/system/AlertBanner';
import InputField from '../components/system/InputField';
import { auth } from '../services/firebase';
import { upsertUserProfile } from '../services/userProfile';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';

export default function AuthScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const [mode, setMode] = useState<'signIn' | 'create'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [banner, setBanner] = useState<
    { variant: 'error' | 'success'; title: string; message: string } | null
  >(null);

  const validate = () => {
    let ok = true;
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError(t('auth.emailRequired'));
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t('auth.emailInvalid'));
      ok = false;
    } else {
      setEmailError(undefined);
    }

    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
      ok = false;
    } else if (mode === 'create' && password.length < 6) {
      setPasswordError(t('auth.passwordTooShort'));
      ok = false;
    } else {
      setPasswordError(undefined);
    }

    return ok;
  };

  const submit = async () => {
    setBanner(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const credential =
        mode === 'signIn'
          ? await signInWithEmailAndPassword(auth, email.trim(), password)
          : await createUserWithEmailAndPassword(auth, email.trim(), password);
      await upsertUserProfile(credential.user);
      setPassword('');
      if (mode === 'create') {
        setBanner({
          variant: 'success',
          title: t('settings.accountCreatedTitle'),
          message: t('settings.accountCreatedText'),
        });
      }
    } catch (error) {
      console.error(error);
      setBanner({
        variant: 'error',
        title:
          mode === 'signIn'
            ? t('settings.signInFailedTitle')
            : t('settings.signUpFailedTitle'),
        message:
          mode === 'signIn'
            ? t('settings.signInFailedText')
            : t('settings.signUpFailedText'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setEmailError(t('auth.emailRequired'));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setBanner({
        variant: 'success',
        title: t('auth.resetSentTitle'),
        message: t('auth.resetSentText', { email: email.trim() }),
      });
    } catch (error) {
      console.error(error);
      setBanner({
        variant: 'error',
        title: t('auth.resetFailedTitle'),
        message: t('auth.resetFailedText'),
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="shield-checkmark" size={24} color={theme.color.primary} />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>{t('app.name')}</Text>
              <Text style={styles.brandMeta} numberOfLines={1}>
                {t('app.tagline')}
              </Text>
            </View>
          </View>

          <View style={styles.headlineBlock}>
            <Text style={styles.headline}>{t('auth.title')}</Text>
            <Text style={styles.subcopy}>{t('auth.subtitle')}</Text>
          </View>

          <IslandCard style={styles.card} contentStyle={styles.cardInner}>
            <SegmentedControl
              value={mode}
              accessibilityLabel={t('auth.title')}
              onChange={(value) => {
                setMode(value as 'signIn' | 'create');
                setBanner(null);
              }}
              options={[
                { value: 'signIn', label: t('common.signIn') },
                { value: 'create', label: t('common.createAccount') },
              ]}
            />

            {banner ? (
              <AlertBanner
                variant={banner.variant}
                title={banner.title}
                message={banner.message}
              />
            ) : null}

            <InputField
              label={t('common.email')}
              placeholder={t('auth.emailPlaceholder')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              error={emailError}
            />
            <InputField
              label={t('common.password')}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoComplete={mode === 'create' ? 'new-password' : 'password'}
              textContentType={mode === 'create' ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={submit}
              value={password}
              onChangeText={setPassword}
              error={passwordError}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? t('auth.hidePassword') : t('auth.showPassword')
              }
              onPress={() => setShowPassword((value) => !value)}
              style={styles.revealButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={theme.color.textSecondary}
              />
              <Text style={styles.revealText}>
                {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              </Text>
            </Pressable>
            {mode === 'signIn' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('auth.forgotPassword')}
                onPress={handleForgotPassword}
                style={styles.forgotWrap}
              >
                <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
              </Pressable>
            ) : null}
            <Button
              label={mode === 'signIn' ? t('common.signIn') : t('common.createAccount')}
              size="lg"
              fullWidth
              onPress={submit}
              loading={submitting}
            />
          </IslandCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    flex: {
      flex: 1,
    },
    heroGlow: {
      position: 'absolute',
      top: -140,
      left: -60,
      right: -60,
      height: 480,
      opacity: 0.14,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      paddingHorizontal: theme.space[5],
      paddingVertical: theme.space[10],
      gap: theme.space[6],
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
    },
    brandMark: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
    },
    brandCopy: {
      flex: 1,
    },
    brandName: {
      fontSize: theme.type.heading.fontSize,
      lineHeight: theme.type.heading.lineHeight,
      fontWeight: theme.type.heading.fontWeight,
      color: theme.color.textPrimary,
      letterSpacing: -0.2,
    },
    brandMeta: {
      marginTop: 2,
      fontSize: theme.type.caption.fontSize,
      lineHeight: theme.type.caption.lineHeight,
      color: theme.color.textSecondary,
    },
    headlineBlock: {
      gap: theme.space[2],
    },
    headline: {
      fontSize: theme.type.display.fontSize,
      lineHeight: theme.type.display.lineHeight,
      fontWeight: theme.type.display.fontWeight,
      letterSpacing: theme.type.display.letterSpacing,
      color: theme.color.textPrimary,
    },
    subcopy: {
      fontSize: theme.type.body.fontSize,
      lineHeight: theme.type.body.lineHeight,
      color: theme.color.textSecondary,
    },
    card: {
      marginTop: theme.space[1],
    },
    cardInner: {
      padding: theme.space[5],
      gap: theme.space[3],
    },
    modeRow: {
      flexDirection: 'row',
      gap: theme.space[2],
    },
    modeChip: {
      flex: 1,
    },
    revealButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[2],
      alignSelf: 'flex-start',
    },
    revealText: {
      fontSize: theme.type.label.fontSize,
      lineHeight: theme.type.label.lineHeight,
      fontWeight: theme.type.label.fontWeight,
      color: theme.color.textSecondary,
    },
    forgotWrap: {
      alignSelf: 'flex-end',
      minHeight: 44,
      justifyContent: 'center',
    },
    forgotText: {
      fontSize: theme.type.label.fontSize,
      lineHeight: theme.type.label.lineHeight,
      fontWeight: theme.type.label.fontWeight,
      color: theme.color.primary,
    },
    footer: {
      textAlign: 'center',
      fontSize: theme.type.caption.fontSize,
      color: theme.color.textSecondary,
    },
  });
