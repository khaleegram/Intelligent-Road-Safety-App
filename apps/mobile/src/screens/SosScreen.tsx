import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';

import Button from '../components/Button';
import IslandBar from '../components/IslandBar';
import IslandCard from '../components/IslandCard';
import InputField from '../components/system/InputField';
import ListItem from '../components/system/ListItem';
import EmptyState from '../components/system/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  addContact,
  deleteContact,
  listContacts,
} from '../services/emergencyContacts';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import type { EmergencyContact } from '../types';
import { type Theme, useTheme } from '../theme';

export default function SosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { isAdmin } = useAdminAccess();
  const { contentPadding } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  const [compactBar, setCompactBar] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    setContacts(await listContacts());
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleAddContact = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      await addContact({
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim() || undefined,
      });
      setName('');
      setPhone('');
      setRelationship('');
      await loadContacts();
      Alert.alert(t('common.ok'), t('sos.saved'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await deleteContact(id);
    await loadContacts();
    Alert.alert(t('common.ok'), t('sos.deleted'));
  };

  const triggerSos = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(t('common.warning'), t('sos.locationMissing'));
      return;
    }

    const position = await Location.getCurrentPositionAsync({});
    const lat = position.coords.latitude.toFixed(5);
    const lng = position.coords.longitude.toFixed(5);
    const message = t('sos.shareMessage', { lat, lng });

    await Share.share({ message });
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
            eyebrow={t('sos.eyebrow')}
            title={t('sos.title')}
            subtitle={t('sos.subtitle')}
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
          <Button label={t('sos.trigger')} onPress={triggerSos} />
          <Button
            label={t('sos.callFrsc')}
            variant="secondary"
            onPress={() => Linking.openURL('tel:122')}
          />
          <Button
            label={t('sos.callPolice')}
            variant="secondary"
            onPress={() => Linking.openURL('tel:112')}
          />
        </IslandCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('sos.contacts')}</Text>
          <IslandCard style={styles.card}>
            {contacts.length === 0 ? (
              <EmptyState
                title={t('sos.emptyContacts')}
                reason={t('sos.addContact')}
                nextStep={t('sos.name')}
              />
            ) : (
              contacts.map((contact) => (
                <View key={contact.id ?? contact.phone} style={styles.contactRow}>
                  <ListItem
                    title={contact.name}
                    subtitle={contact.phone}
                    meta={contact.relationship}
                  />
                  <Button
                    label={t('sos.delete')}
                    variant="ghost"
                    size="sm"
                    onPress={() => handleDelete(contact.id)}
                  />
                </View>
              ))
            )}
          </IslandCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('sos.addContact')}</Text>
          <IslandCard style={styles.card}>
            <InputField
              label={t('sos.name')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <InputField
              label={t('sos.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <InputField
              label={t('sos.relationship')}
              value={relationship}
              onChangeText={setRelationship}
            />
            <Button
              label={t('common.save')}
              onPress={handleAddContact}
              disabled={saving || !name.trim() || !phone.trim()}
            />
          </IslandCard>
        </View>

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
    section: {
      gap: theme.tokens.spacing[2],
    },
    sectionTitle: {
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.bold,
      color: theme.tokens.color.textPrimary,
      textTransform: 'uppercase',
    },
    card: {
      gap: theme.tokens.spacing[2],
    },
    contactRow: {
      gap: theme.tokens.spacing[1],
    },
  });
