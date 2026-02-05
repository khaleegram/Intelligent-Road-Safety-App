import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import MapScreen from '../screens/MapScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import '../services/firebase';

export type RootTabParamList = {
  Map: undefined;
  Report: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Map"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#111',
          tabBarInactiveTintColor: '#777',
          tabBarStyle: { borderTopColor: '#eee' },
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
