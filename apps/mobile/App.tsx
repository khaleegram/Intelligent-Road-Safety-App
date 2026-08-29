import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import { I18nProvider } from './src/i18n';
import { initAppCheck } from './src/services/appCheck';
import { subscribeToConnectivity } from './src/services/connectivity';
import { offlineQueue } from './src/services/offlineQueue';
import { ThemeProvider, useTheme } from './src/theme';

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

function ConnectivitySync() {
  useEffect(() => {
    return subscribeToConnectivity((online) => {
      if (online) {
        offlineQueue.sync().catch(() => undefined);
      }
    });
  }, []);
  return null;
}

function AppCheckBootstrap() {
  useEffect(() => {
    initAppCheck().catch(() => undefined);
  }, []);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SafeAreaProvider>
          <AppCheckBootstrap />
          <ConnectivitySync />
          <RootNavigator />
          <ThemedStatusBar />
        </SafeAreaProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
