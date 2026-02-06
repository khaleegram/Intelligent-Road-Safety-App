import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme';

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RootNavigator />
        <ThemedStatusBar />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
