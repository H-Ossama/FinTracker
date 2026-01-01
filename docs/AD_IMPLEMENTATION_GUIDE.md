# Ad Implementation Guide for FinTracker

## Overview

This document describes the halal-compliant advertising system implemented in FinTracker. The system is designed to show non-intrusive ads to free users while ensuring all ads meet Islamic guidelines.

## Features

### 1. App Open Ad
- **When shown**: Once when the app is first opened (fresh launch)
- **Not shown when**: App returns from background, user is Pro subscriber
- **Countdown**: 5 seconds before close button appears

### 2. Banner Ad
- **Location**: Bottom of screen (above tab bar on main screens)
- **Size**: Standard 320x50 banner
- **Screens excluded**: Sign In, Sign Up, App Lock, PIN Setup, Subscription, Privacy Policy, Terms of Use

### 3. Interstitial Ad
- **When shown**: First time visiting a screen per session
- **Not shown when**: Going back to previously visited screen, user is Pro subscriber
- **Minimum interval**: 60 seconds between interstitials
- **Countdown**: 5 seconds before close button appears
- **Screens excluded**: Sign In, Sign Up, App Lock, PIN Setup, Subscription, Privacy Policy, Terms of Use, Notification screens

## Session Tracking

The ad system tracks screen visits per session:
- **Session starts**: When app is launched fresh (not from background)
- **Session ends**: When app is completely closed
- **Tracking resets**: When app is reopened after being closed

This ensures:
- Users only see interstitial ads once per screen per session
- Going back to a screen won't trigger another ad
- Closing and reopening the app resets all tracking

## Halal Compliance Setup

### AdMob Dashboard Configuration

To ensure ads comply with Islamic guidelines, configure the following in your AdMob dashboard:

1. **Navigate to**: AdMob > Apps > FINEX > Ad Units > [Your Ad Unit]

2. **Block the following categories** under "Sensitive categories":
   - Alcohol
   - Dating & Relationships
   - Gambling & Betting
   - Lottery
   - Sexual & Suggestive Content
   - Tobacco
   - Drugs & Supplements
   - Weapons
   - Political Content
   - Religion (to avoid non-Islamic content)

3. **Enable** "Ad Content Rating":
   - Set to "Family" or "General Audiences" only

4. **Block specific advertisers** that promote:
   - Cryptocurrency trading/gambling
   - Interest-based loans (Riba)
   - Alcohol brands
   - Dating apps
   - Entertainment with mature content

### Content Filtering in Code

The following categories are blocked programmatically (as a reference):
- `afa-adult` - Adult/Mature content
- `afa-dating` - Dating services
- `afa-gambling` - Gambling & Betting
- `afa-alcohol` - Alcohol
- `afa-drugs` - Drugs & supplements
- `afa-tobacco` - Tobacco
- `afa-weapons` - Weapons
- `afa-lottery` - Lottery
- `afa-casino` - Casino

## Installation

### 1. Install Required Package

```bash
npm install react-native-google-mobile-ads
```

### 2. Expo config plugin + AdMob App IDs (recommended)

This app is Expo-managed, so don’t manually edit AndroidManifest/Info.plist. Instead, configure the plugin in [app.config.js](app.config.js).

The project is already set up to read these env vars:
- `ADMOB_ANDROID_APP_ID`
- `ADMOB_IOS_APP_ID`

If you don’t set them, the app uses Google’s **test App IDs** by default.

### 3. Build a Dev Client (required)

`react-native-google-mobile-ads` is a native module, so it won’t work in **Expo Go**.

Use one of these:

```bash
# Android
npx expo run:android

# iOS (macOS)
npx expo run:ios
```

Or use EAS:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

### 4. Replace Ad Unit IDs

In `src/services/adService.ts`, replace the placeholder Ad Unit IDs with your actual AdMob Ad Unit IDs:

```typescript
export const AD_UNIT_IDS = {
  android: {
    banner: 'YOUR_ANDROID_BANNER_AD_UNIT_ID',
    interstitial: 'YOUR_ANDROID_INTERSTITIAL_AD_UNIT_ID',
    appOpen: 'YOUR_ANDROID_APP_OPEN_AD_UNIT_ID',
  },
  ios: {
    banner: 'YOUR_IOS_BANNER_AD_UNIT_ID',
    interstitial: 'YOUR_IOS_INTERSTITIAL_AD_UNIT_ID',
    appOpen: 'YOUR_IOS_APP_OPEN_AD_UNIT_ID',
  },
};
```

## Usage

### Adding Ads to a New Screen

For screens that need ads:

```tsx
import AdScreenWrapper from '../components/AdScreenWrapper';

const MyScreen = () => {
  return (
    <AdScreenWrapper screenName="MyScreen" showBanner showInterstitial>
      {/* Your screen content */}
    </AdScreenWrapper>
  );
};
```

### Manually Controlling Ads

Using the ad hooks directly:

```tsx
import { useAds } from '../contexts/AdContext';

const MyComponent = () => {
  const { adsEnabled, shouldShowBanner, shouldShowInterstitial } = useAds();
  
  // Check if ads should be shown
  if (adsEnabled && shouldShowBanner('MyScreen')) {
    // Show banner
  }
};
```

## File Structure

```
src/
├── services/
│   └── adService.ts          # Core ad configuration and session management
├── contexts/
│   └── AdContext.tsx         # React context for ad state management
├── components/
│   ├── AdBanner.tsx          # Banner ad component
│   ├── AdScreenWrapper.tsx   # Wrapper component for screens with ads
│   ├── AppOpenAd.tsx         # Full-screen app open ad
│   └── InterstitialAd.tsx    # Full-screen interstitial ad
```

## Testing

During development, test ad units are automatically used when `__DEV__` is true. These show test ads that don't generate revenue but allow you to test the integration.

To test with production ads (only do this briefly):
1. Build a release version of the app
2. Test on a real device
3. Don't click on your own ads (violates AdMob policies)

## Troubleshooting

### Ads Not Showing

1. Check internet connection
2. Verify Ad Unit IDs are correct
3. Ensure AdMob account is approved
4. Check if app-ads.txt is properly configured on your website

### Wrong Ad Content

1. Review blocked categories in AdMob dashboard
2. Enable stricter content filtering
3. Report inappropriate ads to AdMob

## Pro User Experience

Pro subscribers never see ads. The `useSubscription` hook's `isPro` flag is used to completely disable ad loading and display for paying users.

## Best Practices

1. **Respect user experience**: Don't show too many ads
2. **Strategic placement**: Ads should not interrupt important actions
3. **Clear labeling**: Always label ads appropriately
4. **Easy upgrade path**: Provide clear option to upgrade to Pro

## Revenue Considerations

- Banner ads: Low revenue per impression, but non-intrusive
- Interstitial ads: Higher revenue, but use sparingly
- App open ads: Good balance of visibility and user acceptance

Estimated revenue (varies by region):
- Banner: $0.10 - $0.50 per 1000 impressions
- Interstitial: $1 - $5 per 1000 impressions
- App Open: $2 - $8 per 1000 impressions
