import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let permissionRequested = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionRequested) {
    const status = await Notifications.getPermissionsAsync();
    return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }

  permissionRequested = true;
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }

  if (granted && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('risk-alerts', {
      name: 'Risk Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#f97316',
    });
  }

  return granted;
}

export async function sendLocalRiskAlert(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data,
    },
    trigger: null,
  });
}
