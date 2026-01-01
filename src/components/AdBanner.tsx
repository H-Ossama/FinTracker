/**
 * AdBanner Component
 * 
 * A small, non-intrusive banner ad displayed at the bottom of screens.
 * Only shown to free users.
 * 
 * Features:
 * - Halal-compliant content filtering
 * - Graceful error handling
 * - Minimal visual footprint
 * - Safe area aware
 */

import React, { useState, memo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../contexts/AdContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAdUnitId } from '../services/adService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Standard banner sizes
const BANNER_HEIGHT = 50;
const BANNER_WIDTH = SCREEN_WIDTH;

interface AdBannerProps {
  screenName: string;
}

/**
 * AdBanner - A small banner ad for free users
 * 
 * Place this at the bottom of screen components where you want to show banner ads.
 * The banner will automatically hide for Pro users.
 */
const AdBanner: React.FC<AdBannerProps> = memo(({ screenName }) => {
  const { adsEnabled, shouldShowBanner } = useAds();
  const { theme, isDark } = useTheme();
  const [hasError, setHasError] = useState(false);

  // Check if banner should be shown for this screen
  const showBanner = adsEnabled && shouldShowBanner(screenName);

  // Don't render anything if ads are disabled or banner shouldn't show
  if (!showBanner) {
    return null;
  }

  // Don't render if there was an error loading the ad
  if (hasError) {
    return null;
  }

  return (
    <View 
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
          borderTopColor: isDark ? '#38383A' : '#E0E0E0',
        },
      ]}
    >
      <View style={styles.adContainer}>
        <BannerAd
          unitId={getAdUnitId('banner')}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
            keywords: ['finance', 'budgeting', 'saving', 'banking', 'family'],
          }}
          onAdFailedToLoad={(error) => {
            console.log('Banner ad failed to load:', error);
            setHasError(true);
          }}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderTopWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdBanner;
