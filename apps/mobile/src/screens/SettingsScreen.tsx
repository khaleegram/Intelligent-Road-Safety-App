import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import type { RootTabParamList } from '../navigation/RootNavigator';

export default function SettingsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Settings"
        subtitle="Manage notifications and safety preferences."
      />
      <View style={styles.actions}>
        <Button label="Back to map" onPress={() => navigation.navigate('Map')} />
        <Button
          label="Report incident"
          variant="secondary"
          onPress={() => navigation.navigate('Report')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
});
