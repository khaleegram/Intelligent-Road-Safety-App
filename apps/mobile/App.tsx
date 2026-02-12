import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import { I18nProvider } from './src/i18n';
import { ThemeProvider, useTheme } from './src/theme';

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SafeAreaProvider>
          <RootNavigator />
          <ThemedStatusBar />
        </SafeAreaProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
