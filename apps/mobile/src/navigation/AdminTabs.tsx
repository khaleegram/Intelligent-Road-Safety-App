import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';

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
  const styles = createStyles(theme);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
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
            route.name === 'Dashboard'
              ? 'grid'
              : route.name === 'Hotspots'
                ? 'flame'
                : route.name === 'Reports'
                  ? 'warning'
                  : 'people';
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
