import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useI18n } from '../i18n';
import type { RootStackParamList } from '../navigation/RootNavigator';
import PageHeader, { type HeaderAction, type HeaderMenuItem } from './PageHeader';

type IslandBarProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  mode: 'public' | 'admin';
  isAdmin?: boolean;
  compact?: boolean;
  onBack?: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  onToggle?: (mode: 'public' | 'admin') => void;
};

export default function IslandBar({
  title,
  subtitle,
  eyebrow,
  mode,
  isAdmin = false,
  compact = false,
  onBack,
  onSearchPress,
  onNotificationsPress,
  onProfilePress,
  onToggle,
}: IslandBarProps) {
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const actions: HeaderAction[] = [
    {
      icon: 'search',
      label: t('nav.search'),
      onPress: onSearchPress ?? (() => navigation.navigate('Search', { mode })),
    },
    {
      icon: 'notifications-outline',
      label: t('nav.notifications'),
      onPress:
        onNotificationsPress ?? (() => navigation.navigate('Notifications', { mode })),
    },
  ];

  const menu: HeaderMenuItem[] = [
    {
      label: t('nav.profile'),
      icon: 'person-circle-outline',
      onPress: onProfilePress ?? (() => navigation.navigate('Profile', { mode })),
    },
  ];

  if (isAdmin && mode === 'public') {
    menu.push({
      label: t('nav.admin'),
      icon: 'swap-horizontal',
      onPress: () => onToggle?.('admin'),
    });
  }

  if (mode === 'admin') {
    menu.push({
      label: t('nav.public'),
      icon: 'swap-horizontal',
      onPress: () => onToggle?.('public'),
    });
  }

  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      compact={compact}
      onBack={onBack}
      actions={actions}
      menu={menu}
      menuLabel={t('common.more')}
      closeLabel={t('common.close')}
    />
  );
}
