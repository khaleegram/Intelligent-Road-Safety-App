import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';

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
  const styles = createStyles(theme);

  return (
    <Tab.Navigator
      initialRouteName="Map"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.tokens.color.primary,
        tabBarInactiveTintColor: theme.tokens.color.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderTopWidth: 0,
          borderRadius: 0,
          borderTopLeftRadius: theme.tokens.radius.xl,
          borderTopRightRadius: theme.tokens.radius.xl,
          borderWidth: 1,
          borderColor: theme.tokens.color.border,
          backgroundColor: theme.tokens.color.surfaceElevated,
          height: 78,
          paddingTop: theme.tokens.spacing[2],
          paddingBottom: theme.tokens.spacing[2],
          shadowColor: theme.tokens.elevation.lg.shadowColor,
          shadowOpacity: theme.tokens.elevation.lg.shadowOpacity,
          shadowRadius: theme.tokens.elevation.lg.shadowRadius,
          shadowOffset: theme.tokens.elevation.lg.shadowOffset,
          elevation: theme.tokens.elevation.lg.elevation,
        },
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: {
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
          marginTop: 2,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'Map'
              ? 'map'
              : route.name === 'Report'
                ? 'warning'
                : 'settings';
          const active = color === theme.tokens.color.primary;

          return (
            <View style={[styles.iconShell, active && styles.iconShellActive]}>
              <Ionicons
                name={iconName}
                size={size + 1}
                color={active ? theme.tokens.color.textInverse : theme.tokens.color.textSecondary}
              />
            </View>
          );
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    tabItem: {
      minHeight: 56,
      borderRadius: theme.tokens.radius.full,
      paddingTop: theme.tokens.spacing[1],
      paddingBottom: theme.tokens.spacing[1],
    },
    iconShell: {
      width: 34,
      height: 34,
      borderRadius: theme.tokens.radius.full,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconShellActive: {
      borderColor: theme.tokens.color.primary,
      backgroundColor: theme.tokens.color.primary,
    },
  });
