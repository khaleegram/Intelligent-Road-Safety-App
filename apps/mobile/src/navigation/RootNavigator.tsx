import { NavigationContainer, DefaultTheme, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminTabs from './AdminTabs';
import PublicTabs from './PublicTabs';
import type { AdminTabParamList } from './AdminTabs';
import type { PublicTabParamList } from './PublicTabs';
import { useTheme } from '../theme';

export type RootStackParamList = {
  Public: NavigatorScreenParams<PublicTabParamList>;
  Admin: NavigatorScreenParams<AdminTabParamList>;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Public" component={PublicTabs} />
        <Stack.Screen name="Admin" component={AdminTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
