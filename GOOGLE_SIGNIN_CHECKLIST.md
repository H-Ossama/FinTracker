# Google Sign-In Configuration Checklist

## ✅ DEVELOPER_ERROR Prevention Checklist

This checklist ensures your Google Sign-In is properly configured to prevent `DEVELOPER_ERROR`.

### Before Building

1. **Run Validation Script**
   ```bash
   npm run validate:google
   ```
   This must show "All critical configurations are correct!" ✅

### Configuration Requirements

#### Package Name Alignment
- ✅ `app.json` Android package: `com.oussamaaaaa.finex`
- ✅ `app.json` iOS bundle: `com.oussamaaaaa.finex`
- ✅ `android/app/build.gradle` applicationId: `com.oussamaaaaa.finex`
- ✅ `android/app/build.gradle` namespace: `com.oussamaaaaa.finex`

#### SHA-1 Fingerprint
- ✅ Debug keystore SHA-1: `04:D1:E2:DF:06:D3:F1:B9:9F:25:36:AA:3D:BC:5F:78:AF:AF:3F:93`
- ✅ Google Services SHA-1 matches debug keystore
- ✅ Firebase Console has correct SHA-1 for package `com.oussamaaaaa.finex`

#### Google Services Configuration
- ✅ `android/app/google-services.json` exists
- ✅ Contains client for package `com.oussamaaaaa.finex`
- ✅ SHA-1 fingerprint matches: `04d1e2df06d3f1b99f2536aa3dbc5f78afaf3f93`
- ✅ Web Client ID: `1034435232632-cfdpko20rk29mphsbo1o7i5pvk9lq1dq.apps.googleusercontent.com`
- ✅ Android Client ID: `1034435232632-shgb0h76pesd2aisvvdcu6rrupvmdsgm.apps.googleusercontent.com`

#### Environment Variables
- ✅ `.env` contains correct Web Client ID
- ✅ iOS Client ID is commented out (Android-only build)
- ✅ Firebase configuration matches google-services.json

### Build Process

1. **Validate Configuration**
   ```bash
   npm run validate:google
   ```

2. **Clean Build (Recommended)**
   ```bash
   npm run prebuild:android
   ```

3. **Rebuild App**
   ```bash
   npx expo run:android
   ```

### Troubleshooting

If you still get `DEVELOPER_ERROR` after following this checklist:

1. **Device Issues**
   - Ensure device/emulator has Google Play Services installed
   - Update Google Play Services to latest version
   - Try on a different device/emulator

2. **Configuration Issues**
   - Re-run `npm run validate:google` to check all configs
   - Verify package name in Firebase Console exactly matches: `com.oussamaaaaa.finex`
   - Verify SHA-1 in Firebase Console exactly matches: `04:D1:E2:DF:06:D3:F1:B9:9F:25:36:AA:3D:BC:5F:78:AF:AF:3F:93`

3. **Rebuild Issues**
   - Delete `android/build` and `android/app/build` folders
   - Run `cd android && ./gradlew clean && cd ..`
   - Rebuild with `npx expo run:android`

4. **Debug Keystore Issues**
   - Check keystore location: `%USERPROFILE%\.android\debug.keystore`
   - Regenerate if needed: `keytool -genkey -alias androiddebugkey -keystore debug.keystore`
   - Update SHA-1 in Firebase Console

### Success Indicators

When properly configured, you should see these logs:
- ✅ `🔧 Configuring Google Sign-In...`
- ✅ `📱 Web Client ID: 1034435232632-cfdpko...`
- ✅ `📦 Expected package: com.oussamaaaaa.finex`
- ✅ `🔑 Expected SHA-1: 04:D1:E2:DF:06:D3:F1:B9:9F:25:36:AA:3D:BC:5F:78:AF:AF:3F:93`
- ✅ `✅ Google Sign-In configured successfully`
- ✅ `📋 Configuration validated for package: com.oussamaaaaa.finex`

### Quick Commands

```bash
# Validate configuration
npm run validate:google

# Clean and prepare for rebuild
npm run prebuild:android

# Rebuild app
npx expo run:android

# Check SHA-1 fingerprint
keytool -list -v -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore -storepass android
```

---
**Last Updated:** November 4, 2025
**Package:** com.oussamaaaaa.finex
**SHA-1:** 04:D1:E2:DF:06:D3:F1:B9:9F:25:36:AA:3D:BC:5F:78:AF:AF:3F:93