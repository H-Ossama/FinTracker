export default {
  expo: {
    name: "FINEX",
    slug: "finex", 
    version: "2.6.0",
    orientation: "portrait",
    sdkVersion: "54.0.0",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#20C6F7"
    },
    assetBundlePatterns: [
      "assets/**/*",
      "src/**/*.{js,ts,tsx,json}"
    ],
    optimization: {
      minify: true,
      treeshake: true
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    ios: {
      bundleIdentifier: "com.oussamaaaaa.fintracker",
      supportsTablet: true,
      icon: "./assets/icon.png"
    },
    android: {
      package: "com.oussamaaaaa.finex",
      icon: "./assets/icon.png",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#20C6F7"
      },
      versionCode: 10,
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      minSdkVersion: 21,
      buildToolsVersion: "34.0.0",
      enableProguardInReleaseBuilds: true,
      enableSeparateBuildPerCPUArchitecture: true,
      bundleInRelease: true,
      config: {
        useCleartextTraffic: false
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    platforms: [
      "ios",
      "android"
    ],
    plugins: [
      "expo-dev-client",
      "expo-sqlite",
      [
        "expo-notifications",
        {
          icon: "./assets/adaptive-icon.png",
          color: "#20C6F7",
          defaultChannel: "default"
        }
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.1034435232632-cfdpko20rk29mphsbo1o7i5pvk9lq1dq"
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "c3f94c58-e5f4-4e50-b25d-f2b00bd99d2f"
      },
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
      }
    },
    owner: "oussamaaaaa"
  }
};