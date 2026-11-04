import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapScreen from '../screens/MapScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export type PublicTabParamList = {
  Map: { focusLat?: number; focusLng?: number } | undefined;
  Report: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<PublicTabParamList>();

export default function PublicTabs() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Map"
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
            route.name === 'Map'
              ? focused
                ? 'map'
                : 'map-outline'
              : route.name === 'Report'
                ? focused
                  ? 'warning'
                  : 'warning-outline'
                : focused
                  ? 'settings'
                  : 'settings-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: t('nav.map') }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{ tabBarLabel: t('nav.report') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: t('nav.settings') }}
      />
    </Tab.Navigator>
  );
}

