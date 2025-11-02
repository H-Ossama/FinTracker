# Build Configuration Fix - Native Android Project

## Problem
When running `eas build --profile development --platform android`, the build failed with errors:
- `"build.development.android.applicationId" is not allowed`
- `"build.development.ios.bundleIdentifier" is not allowed`

## Root Cause
The project uses **bare workflow** (has native `android/` directory), not managed workflow. In bare workflow, EAS Build reads the package name from native Android files (`build.gradle`), not from `app.json` or `eas.json`.

## Solution Implemented

### 1. Updated `eas.json`
Removed invalid `applicationId` and `bundleIdentifier` fields from build profiles. Instead, we use `env.APP_VARIANT` to pass the build type to native code.

```json
{
  "build": {
    "development": {
      "env": {
        "APP_VARIANT": "development"  // ← This is passed to build.gradle
      }
    }
  }
}
```

### 2. Updated `android/app/build.gradle`
Modified the `defaultConfig` block to read `APP_VARIANT` environment variable and dynamically set the `applicationId`:

```gradle
defaultConfig {
    // Dynamic applicationId based on APP_VARIANT environment variable
    def appVariant = System.getenv("APP_VARIANT") ?: "production"
    def baseAppId = 'com.oussamaaaaa.fintracker'
    
    if (appVariant == "development") {
        applicationId "${baseAppId}.dev"
    } else if (appVariant == "preview") {
        applicationId "${baseAppId}.preview"
    } else {
        applicationId baseAppId
    }
    
    // Add variant to app name for easy identification
    if (appVariant == "development") {
        resValue "string", "app_name", "FINEX (Dev)"
    } else if (appVariant == "preview") {
        resValue "string", "app_name", "FINEX (Preview)"
    } else {
        resValue "string", "app_name", "FINEX"
    }
}
```

### 3. Updated `app.config.js`
Simplified to read from `app.json` and modify package names based on `APP_VARIANT` (for non-native parts of the app):

```javascript
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

module.exports = () => {
  const appJson = require('./app.json');
  const baseConfig = appJson.expo;

  let appName = baseConfig.name;
  let bundleId = baseConfig.android.package;

  if (IS_DEV) {
    appName = 'FINEX (Dev)';
    bundleId = 'com.oussamaaaaa.fintracker.dev';
  } else if (IS_PREVIEW) {
    appName = 'FINEX (Preview)';
    bundleId = 'com.oussamaaaaa.fintracker.preview';
  }

  return {
    ...baseConfig,
    name: appName,
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: bundleId,
    },
    android: {
      ...baseConfig.android,
      package: bundleId,
    },
  };
};
```

## Result

Now when you build with different profiles:

| Build Profile | Package Name | App Display Name | Use Case |
|---------------|--------------|------------------|----------|
| `development` | `com.oussamaaaaa.fintracker.dev` | **FINEX (Dev)** | Development with hot reload |
| `preview` | `com.oussamaaaaa.fintracker.preview` | **FINEX (Preview)** | Internal testing |
| `production` | `com.oussamaaaaa.fintracker` | **FINEX** | Production release |

## How It Works

1. **EAS Build** sets the `APP_VARIANT` environment variable based on the build profile
2. **Gradle** reads this variable during the build process
3. **applicationId** is set dynamically in `build.gradle`
4. **App name** is set dynamically via `resValue`
5. **Result:** Different package names = separate apps on the same device!

## Testing

```bash
# Build development APK
eas build --profile development --platform android

# The APK will have:
# - Package: com.oussamaaaaa.fintracker.dev
# - Display name: FINEX (Dev)
# - Can coexist with production FINEX app
```

## Important Notes

### For Bare Workflow Projects:
- ✅ Package name MUST be changed in `android/app/build.gradle`
- ✅ App name can be changed via `resValue` in `build.gradle`
- ❌ Don't try to set `applicationId` in `eas.json` (not supported)
- ❌ `app.json` package name is ignored when native code exists

### For Managed Workflow Projects:
- ✅ Package name can be set in `app.json`
- ✅ EAS reads from `app.json` or `app.config.js`
- ✅ No need to modify native files

## File Changes Summary

### Modified Files:
1. ✅ `eas.json` - Removed invalid fields, added `APP_VARIANT` env vars
2. ✅ `android/app/build.gradle` - Added dynamic applicationId logic
3. ✅ `app.config.js` - Updated to properly handle variants

### Unchanged Files:
- ✅ `app.json` - Kept as base configuration
- ✅ `android/app/src/main/AndroidManifest.xml` - Already uses `@string/app_name`
- ✅ `android/app/src/main/res/values/strings.xml` - Default app_name remains

## Next Steps

1. **Build the development APK:**
   ```bash
   eas build --profile development --platform android
   ```

2. **Install both apps on your device:**
   - FINEX (your production app with data)
   - FINEX (Dev) (your new development app)

3. **Start development:**
   ```bash
   npm start
   ```

4. **Scan QR code with FINEX (Dev) app** - it will open the correct app now!

## Verification

After building, you can verify the package name:
```bash
# After downloading the APK
aapt dump badging your-app.apk | grep package

# You should see:
# package: name='com.oussamaaaaa.fintracker.dev' versionCode='2' ...
```

## References

- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [Android Build Configuration](https://developer.android.com/studio/build/build-variants)
- [Expo Bare Workflow](https://docs.expo.dev/bare/overview/)
