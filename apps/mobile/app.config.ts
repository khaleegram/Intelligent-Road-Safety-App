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
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
      },
    },
  };
};
