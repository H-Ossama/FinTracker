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

import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../contexts/AdContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAdRequestConfig, getAdUnitId } from '../services/adService';

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
  const [hasPermanentError, setHasPermanentError] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_RETRIES = 3;

  const unitId = useMemo(() => getAdUnitId('banner'), []);
  const requestOptions = useMemo(() => getAdRequestConfig(), []);

  // Check if banner should be shown for this screen
  const showBanner = adsEnabled && shouldShowBanner(screenName);

  // Don't render anything if ads are disabled or banner shouldn't show
  if (!showBanner) {
    return null;
  }

  // Don't render if we've given up for this screen session
  if (hasPermanentError) {
    return null;
  }

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  const scheduleRetry = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const nextRetryCount = retryCountRef.current + 1;
    retryCountRef.current = nextRetryCount;

    if (nextRetryCount > MAX_RETRIES) {
      setHasPermanentError(true);
      setIsCoolingDown(false);
      return;
    }

    const delayMs = Math.min(30000, 1500 * Math.pow(2, nextRetryCount - 1));
    setIsCoolingDown(true);
    retryTimerRef.current = setTimeout(() => {
      setReloadKey((k) => k + 1);
      setIsCoolingDown(false);
    }, delayMs);
  };

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
        {!isCoolingDown ? (
          <BannerAd
            key={reloadKey}
            unitId={unitId}
            size={BannerAdSize.BANNER}
            requestOptions={requestOptions}
            onAdLoaded={() => {
              retryCountRef.current = 0;
              setHasPermanentError(false);
              setIsCoolingDown(false);
            }}
            onAdFailedToLoad={(error) => {
              // Treat as transient by default (e.g. internal errors, temporary network issues).
              // We'll retry a few times, then give up for this session to avoid noisy logs.
              console.log('Banner ad failed to load:', {
                code: (error as any)?.code,
                message: (error as any)?.message,
              });
              scheduleRetry();
            }}
          />
        ) : (
          <View style={styles.cooldownPlaceholder} />
        )}
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
  cooldownPlaceholder: {
    width: '100%',
    height: BANNER_HEIGHT,
  },
});

export default AdBanner;
