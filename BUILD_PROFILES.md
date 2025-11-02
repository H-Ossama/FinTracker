# Build Profiles Configuration

## Overview

This project is configured with **3 separate build profiles** that allow multiple versions of the app to coexist on the same device:

### 📱 Build Profiles

| Profile | Package Name | App Name | Use Case |
|---------|-------------|----------|----------|
| **Production** | `com.oussamaaaaa.fintracker` | FINEX | Official release version for end users |
| **Development** | `com.oussamaaaaa.fintracker.dev` | FINEX (Dev) | Testing with Expo Dev Client & hot reload |
| **Preview** | `com.oussamaaaaa.fintracker.preview` | FINEX (Preview) | Testing production-like builds internally |

## 🔨 Building

### Development Build (for testing with hot reload)
```bash
eas build --profile development --platform android
```
- Creates APK with `.dev` package suffix
- Includes Expo Dev Client
- Shows as "FINEX (Dev)" on device
- Can coexist with production app

### Preview Build (for internal testing)
```bash
eas build --profile preview --platform android
```
- Creates APK with `.preview` package suffix
- Production-like but for internal distribution
- Shows as "FINEX (Preview)" on device
- Can coexist with both dev and production apps

### Production Build (for store release)
```bash
eas build --profile production --platform android
```
- Creates AAB (Android App Bundle)
- Optimized for Google Play Store
- Shows as "FINEX" on device
- Official package name: `com.oussamaaaaa.fintracker`

## 🚀 Development Workflow

1. **Install Development Build**
   ```bash
   eas build --profile development --platform android
   ```
   
2. **Start Development Server**
   ```bash
   npm start
   ```

3. **Scan QR Code**
   - Open "FINEX (Dev)" app on your phone
   - Scan the QR code from terminal
   - Hot reload works automatically

4. **Your production app remains untouched!**
   - Production "FINEX" keeps all your data
   - Development "FINEX (Dev)" is separate
   - Test freely without worry

## 💾 Data Separation

Each build profile has its own:
- ✅ Separate app installation
- ✅ Separate data storage
- ✅ Separate AsyncStorage
- ✅ Separate SQLite database
- ✅ Separate app icon (can be customized)

This means:
- **Production data is never affected** by development testing
- **Each version has independent data**
- **Easy to compare behavior** between versions

## 📝 Configuration Files

### `eas.json`
Contains build profiles with different package names per profile:
- `development`: Includes `applicationId` override for Android
- `preview`: Includes `applicationId` override for Android
- `production`: Uses default package name from `app.json`

### `app.config.js`
Dynamically configures app based on `APP_VARIANT` environment variable:
- Changes app display name
- Adjusts bundle identifiers
- Loaded during build process

### `app.json`
Base configuration for all builds (production defaults)

## 🎨 Customizing Dev Build Icon (Optional)

To make it easier to distinguish builds visually, you can create separate icons:

1. Create `assets/icon-dev.png` (with a badge or different color)
2. Update `app.config.js`:
   ```javascript
   icon: IS_DEV ? './assets/icon-dev.png' : './assets/icon.png'
   ```

## ⚠️ Important Notes

- **First time**: You must build and install the development build APK
- **Updates**: After installing dev build, you can use Expo Go workflow with `npm start`
- **Production**: Always test preview builds before releasing to production
- **Clean builds**: If facing issues, run `eas build --clear-cache`

## 🔍 Troubleshooting

### QR code opens wrong app
- **Solution**: The new development build hasn't been installed yet
- Build with `eas build --profile development --platform android`
- Install the new APK

### Can't find "FINEX (Dev)" app
- Check if build completed successfully: `eas build:list`
- Download and install the APK manually if needed

### Development build not updating
- Make sure you're running `npm start` in terminal
- Scan QR code from the terminal (not Expo Go)
- Shake device to open developer menu → Reload

## 📚 Resources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [App Config](https://docs.expo.dev/workflow/configuration/)
