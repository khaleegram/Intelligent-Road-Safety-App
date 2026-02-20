import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

import Button from '../components/Button';
import IslandCard from '../components/IslandCard';
import { auth } from '../services/firebase';
import { upsertUserProfile } from '../services/userProfile';
import { useI18n } from '../i18n';
import { type Theme, useTheme } from '../theme';

export default function AuthScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!email.trim() || !password) {
      Alert.alert(t('settings.missingCredsTitle'), t('settings.missingCredsText'));
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await upsertUserProfile(credential.user);
      setPassword('');
    } catch (error) {
      console.error(error);
      Alert.alert(t('settings.signInFailedTitle'), t('settings.signInFailedText'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await upsertUserProfile(credential.user);
      setPassword('');
      Alert.alert(t('settings.accountCreatedTitle'), t('settings.accountCreatedText'));
    } catch (error) {
      console.error(error);
      Alert.alert(t('settings.signUpFailedTitle'), t('settings.signUpFailedText'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={theme.gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBackdrop}
      />
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <IslandCard variant="hero" style={styles.card} contentStyle={styles.cardInner}>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('common.email')}
            placeholderTextColor={theme.tokens.color.textInverse}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder={t('common.password')}
            placeholderTextColor={theme.tokens.color.textInverse}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <View style={styles.actions}>
            <Button
              label={submitting ? t('settings.signingIn') : t('common.signIn')}
              onPress={handleSignIn}
              disabled={submitting}
            />
            <Button
              label={submitting ? t('settings.creatingAccount') : t('common.createAccount')}
              variant="secondary"
              onPress={handleCreateAccount}
              disabled={submitting}
            />
          </View>
        </IslandCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    heroBackdrop: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.18,
    },
    wrapper: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      padding: 1.5,
    },
    cardInner: {
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.tokens.color.textInverse,
    },
    subtitle: {
      fontSize: 13,
      color: theme.tokens.color.textInverse,
      marginBottom: theme.spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.tokens.color.surface,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.tokens.color.primaryHover,
      color: theme.tokens.color.textInverse,
    },
    actions: {
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
  });
