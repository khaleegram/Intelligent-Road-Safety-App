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
        tabBarActiveTintColor: theme.tokens.color.primary,
        tabBarInactiveTintColor: theme.tokens.color.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 12,
          borderTopWidth: 0,
          borderRadius: theme.tokens.radius.xl,
          backgroundColor: theme.tokens.color.surface,
          height: 66,
          paddingTop: 8,
          paddingBottom: 8,
          shadowColor: theme.tokens.elevation.md.shadowColor,
          shadowOpacity: theme.tokens.elevation.md.shadowOpacity,
          shadowRadius: theme.tokens.elevation.md.shadowRadius,
          shadowOffset: theme.tokens.elevation.md.shadowOffset,
          elevation: theme.tokens.elevation.md.elevation,
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: {
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.medium,
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
          return <Ionicons name={iconName} size={size + 2} color={color} />;
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
