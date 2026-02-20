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
            route.name === 'Map'
              ? 'map'
              : route.name === 'Report'
                ? 'warning'
                : 'settings';
          return <Ionicons name={iconName} size={size + 2} color={color} />;
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
