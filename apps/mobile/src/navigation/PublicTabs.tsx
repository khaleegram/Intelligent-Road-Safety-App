import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import MapScreen from '../screens/MapScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export type PublicTabParamList = {
  Map: undefined;
  Report: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<PublicTabParamList>();

export default function PublicTabs() {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <Tab.Navigator
      initialRouteName="Map"
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
            route.name === 'Map'
              ? 'map'
              : route.name === 'Report'
                ? 'warning'
                : 'settings';
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
