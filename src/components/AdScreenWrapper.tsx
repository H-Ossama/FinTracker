/**
 * AdScreenWrapper Component
 * 
 * A wrapper component that adds banner ads and handles interstitial ads
 * for any screen. Automatically manages ad visibility based on user's
 * subscription status.
 * 
 * Usage:
 * <AdScreenWrapper screenName="HomeScreen" showBanner>
 *   <YourScreenContent />
 * </AdScreenWrapper>
 */

import React, { useEffect, memo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import AdBanner from './AdBanner';
import { useInterstitialAd } from './InterstitialAd';
import { useAds } from '../contexts/AdContext';

interface AdScreenWrapperProps {
  children: ReactNode;
  screenName: string;
  // Whether to show banner ad at bottom (default: true)
  showBanner?: boolean;
  // Whether to check and show interstitial on mount (default: true)
  showInterstitial?: boolean;
  // Custom style for the container
  style?: any;
}

/**
 * AdScreenWrapper - Wraps screen content with ad support
 * 
 * Features:
 * - Automatically shows interstitial on first visit (per session)
 * - Shows banner ad at bottom of screen
 * - Handles Pro user detection (hides ads)
 * - Safe area aware
 */
const AdScreenWrapper: React.FC<AdScreenWrapperProps> = memo(({
  children,
  screenName,
  showBanner = true,
  showInterstitial = true,
  style,
}) => {
  const { adsEnabled } = useAds();
  const { showInterstitialIfNeeded, InterstitialComponent } = useInterstitialAd(screenName);

  // Show interstitial when screen mounts (if enabled and first visit)
  useEffect(() => {
    if (showInterstitial && adsEnabled) {
      showInterstitialIfNeeded();
    }
  }, [showInterstitial, adsEnabled, showInterstitialIfNeeded]);

  return (
    <View style={[styles.container, style]}>
      {/* Main content */}
      <View style={[styles.content, showBanner && adsEnabled && styles.contentWithBanner]}>
        {children}
      </View>

      {/* Banner ad at bottom */}
      {showBanner && adsEnabled && (
        <AdBanner screenName={screenName} />
      )}

      {/* Interstitial ad modal */}
      {showInterstitial && <InterstitialComponent />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentWithBanner: {
    // Leave space for the banner
    paddingBottom: 0,
  },
});

export default AdScreenWrapper;
