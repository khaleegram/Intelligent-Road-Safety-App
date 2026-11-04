import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdminScreen from '../screens/AdminScreen';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export type AdminTabParamList = {
  Dashboard: undefined;
  Hotspots: undefined;
  Reports: undefined;
  Users: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminTabs() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopWidth: 1,
          borderTopColor: theme.color.border,
          height: 56 + Math.max(insets.bottom, 8),
          paddingTop: theme.space[2],
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarIcon: ({ color, size, focused }) => {
          const iconName =
            route.name === 'Dashboard'
              ? focused
                ? 'grid'
                : 'grid-outline'
              : route.name === 'Hotspots'
                ? focused
                  ? 'flame'
                  : 'flame-outline'
                : route.name === 'Reports'
                  ? focused
                    ? 'warning'
                    : 'warning-outline'
                  : focused
                    ? 'people'
                    : 'people-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        options={{ tabBarLabel: t('nav.dashboard') }}
      >
        {(props) => <AdminScreen {...props} initialTab="overview" showTabs={false} />}
      </Tab.Screen>
      <Tab.Screen name="Hotspots" options={{ tabBarLabel: t('nav.hotspots') }}>
        {(props) => <AdminScreen {...props} initialTab="hotspots" showTabs={false} />}
      </Tab.Screen>
      <Tab.Screen name="Reports" options={{ tabBarLabel: t('nav.reports') }}>
        {(props) => <AdminScreen {...props} initialTab="reports" showTabs={false} />}
      </Tab.Screen>
      <Tab.Screen name="Users" options={{ tabBarLabel: t('nav.users') }}>
        {(props) => <AdminScreen {...props} initialTab="users" showTabs={false} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

