import React, { useEffect, useRef, memo } from 'react';
import { AppOpenAd as RNAppOpenAd, AdEventType } from 'react-native-google-mobile-ads';
import { useAds } from '../contexts/AdContext';
import { getAdUnitId } from '../services/adService';

interface AppOpenAdProps {
  onComplete: () => void;
}

/**
 * AppOpenAd - Full screen ad shown on app launch
 * 
 * This component should be placed at the app root level.
 * It will automatically show when the app is first opened and
 * hide after a timeout or when the user dismisses it.
 */
const AppOpenAdComponent: React.FC<AppOpenAdProps> = memo(({ onComplete }) => {
  const { adsEnabled, shouldShowAppOpenAd, recordAppOpenAdShown } = useAds();
  const hasShown = useRef(false);

  useEffect(() => {
    if (hasShown.current) return;

    if (!adsEnabled || !shouldShowAppOpenAd()) {
      onComplete();
      return;
    }

    hasShown.current = true;

    const appOpenAd = RNAppOpenAd.createForAdRequest(getAdUnitId('appOpen'), {
      requestNonPersonalizedAdsOnly: false,
      keywords: ['finance', 'budgeting', 'saving', 'banking', 'family'],
    });

    const unsubscribeClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeClosed();
      recordAppOpenAdShown();
      onComplete();
    });

    appOpenAd.addAdEventListener(AdEventType.ERROR, () => {
      try {
        unsubscribeClosed();
      } catch {}
      onComplete();
    });

    appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      appOpenAd.show().catch(() => onComplete());
    });

    appOpenAd.load();
  }, [adsEnabled, onComplete, recordAppOpenAdShown, shouldShowAppOpenAd]);

  return null;
});
export default AppOpenAdComponent;
