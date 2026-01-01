const versionConfig = require('./version.json');
const APP_VERSION = versionConfig?.version;

export default ({ config }) => {
  const incoming = (config && (config.expo ?? config)) || {};

  // This repo contains an `android/` native project. When native folders are present,
  // Expo Doctor warns if we keep prebuild-synced config fields here.
  // We intentionally omit those fields so the config reflects a non-CNG project.
  const {
    orientation,
    icon,
    userInterfaceStyle,
    splash,
    ios,
    android,
    plugins,
    ...rest
  } = incoming;

  return {
    expo: {
      name: rest.name ?? 'FINEX',
      slug: rest.slug ?? 'finex',
      version: rest.version ?? APP_VERSION ?? '2.7.0',
      ...rest,
      extra: {
        ...(rest.extra ?? {}),
        eas: {
          ...(rest.extra?.eas ?? {}),
          projectId: 'c3f94c58-e5f4-4e50-b25d-f2b00bd99d2f',
        },
        google: {
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        },
        firebase: {
          apiKey: process.env.FIREBASE_API_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN,
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.FIREBASE_APP_ID,
        },
        ads: {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713',
          iosAppId: process.env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511',
          androidBannerUnitId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID,
          androidInterstitialUnitId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID,
          androidAppOpenUnitId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN_UNIT_ID,
          iosBannerUnitId: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID,
          iosInterstitialUnitId: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID,
          iosAppOpenUnitId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_OPEN_UNIT_ID,
          iosUserTrackingUsageDescription:
            process.env.IOS_USER_TRACKING_USAGE_DESCRIPTION ??
            'This identifier will be used to deliver a better ads experience.',
        },
      },
      owner: 'oussamaaaaa',
    },
  };
};