import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Allow RoadSafe to access your location.',
        },
      ],
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsDownloadToken:
            process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN ??
            process.env.MAPBOX_DOWNLOAD_TOKEN ??
            '',
        },
      ],
    ],
    extra: {
      ...config.extra,
      mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
      },
    },
  };
};
