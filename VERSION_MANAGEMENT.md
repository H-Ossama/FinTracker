# Version Management

This project includes an automated version management system to easily update the app version across all files.

## How to Update Version

### Method 1: Simple Configuration File (Recommended)
1. Edit the `version.json` file and change the version number:
   ```json
   {
     "version": "2.6.0",
     "description": "Edit the version above and run 'npm run update-version' to automatically update all files"
   }
   ```

2. Run the update script:
   ```bash
   npm run update-version
   ```

### Method 2: Direct Script Editing
1. Edit the `NEW_VERSION` constant in `update-version.js`
2. Run: `node update-version.js`

## What Gets Updated

The script automatically updates the version in:

- `package.json` - NPM package version
- `app.json` - Expo app version and Android version code (auto-incremented)
- `src/contexts/NotificationContext.tsx` - Backend API communication
- `src/contexts/LocalizationContext.tsx` - App settings display text (all languages)

## Android Version Code

The Android `versionCode` is automatically incremented each time you run the script. This is required for Play Store updates.

## Verification

After running the script, you can verify the changes by checking:
- The app settings screen shows the new version
- All localization strings are updated
- Package files have the correct version

## Files Structure

```
├── version.json          # Easy-to-edit version configuration
├── update-version.js     # Automated update script
├── package.json          # NPM package version
├── app.json             # Expo app configuration
└── src/
    └── contexts/
        ├── NotificationContext.tsx    # API version
        └── LocalizationContext.tsx   # Display version
```