import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import MapScreen from '../screens/MapScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import '../services/firebase';
import { useTheme } from '../theme';

export type RootTabParamList = {
  Map: undefined;
  Report: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: theme.colors.bg,
          card: theme.colors.surface,
          border: theme.colors.border,
          text: theme.colors.text,
        },
      }}
    >
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
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Report" component={ReportScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
