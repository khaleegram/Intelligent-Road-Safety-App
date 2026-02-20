import { Platform } from 'react-native';

let permissionRequested = false;
let notificationsModule: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  notificationsModule = require('expo-notifications');
} catch {
  notificationsModule = null;
}

if (notificationsModule) {
  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsModule) {
    return false;
  }

  if (permissionRequested) {
    const status = await notificationsModule.getPermissionsAsync();
    return (
      status.granted ||
      status.ios?.status === notificationsModule.IosAuthorizationStatus.PROVISIONAL
    );
  }

  permissionRequested = true;
  const current = await notificationsModule.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) {
    const requested = await notificationsModule.requestPermissionsAsync();
    granted = requested.granted;
  }

  if (granted && Platform.OS === 'android') {
    await notificationsModule.setNotificationChannelAsync('risk-alerts', {
      name: 'Risk Alerts',
      importance: notificationsModule.AndroidImportance.HIGH,
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

  await notificationsModule.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data,
    },
    trigger: null,
  });
}
