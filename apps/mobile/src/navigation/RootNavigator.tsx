import { NavigationContainer, DefaultTheme, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AdminTabs from './AdminTabs';
import PublicTabs from './PublicTabs';
import type { AdminTabParamList } from './AdminTabs';
import type { PublicTabParamList } from './PublicTabs';
import AuthScreen from '../screens/AuthScreen';
import AccidentDetailScreen from '../screens/AccidentDetailScreen';
import HotspotDetailScreen from '../screens/HotspotDetailScreen';
import ResearchDataScreen from '../screens/ResearchDataScreen';
import { auth } from '../services/firebase';
import { useTheme } from '../theme';

export type RootStackParamList = {
  Auth: undefined;
  Public: NavigatorScreenParams<PublicTabParamList> | undefined;
  Admin: NavigatorScreenParams<AdminTabParamList> | undefined;
  AccidentDetail: { accidentId: string };
  HotspotDetail: { hotspotId: string };
  ResearchData: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { theme } = useTheme();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

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
      {authUser ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Public" component={PublicTabs} />
          <Stack.Screen name="Admin" component={AdminTabs} />
          <Stack.Screen name="AccidentDetail" component={AccidentDetailScreen} />
          <Stack.Screen name="HotspotDetail" component={HotspotDetailScreen} />
          <Stack.Screen name="ResearchData" component={ResearchDataScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
