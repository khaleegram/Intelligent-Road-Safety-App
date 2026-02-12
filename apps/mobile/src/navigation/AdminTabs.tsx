import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSoft,
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'Dashboard'
              ? 'grid'
              : route.name === 'Hotspots'
                ? 'flame'
                : route.name === 'Reports'
                  ? 'warning'
                  : 'people';
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
