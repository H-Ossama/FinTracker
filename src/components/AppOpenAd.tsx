import React, { useEffect, useRef, memo } from 'react';
import { AppOpenAd as RNAppOpenAd, AdEventType } from 'react-native-google-mobile-ads';
import { useAds } from '../contexts/AdContext';
import { getAdRequestConfig, getAdUnitId } from '../services/adService';

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

    // If ads are not enabled yet (e.g. subscription state still loading),
    // don't permanently skip the app-open ad; let the effect re-run.
    if (!adsEnabled) return;

    if (!shouldShowAppOpenAd()) {
      onComplete();
      return;
    }

    hasShown.current = true;

    const appOpenAd = RNAppOpenAd.createForAdRequest(getAdUnitId('appOpen'), getAdRequestConfig());

    const unsubscribeClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeClosed();
      recordAppOpenAdShown();
      onComplete();
    });

    appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('App open ad failed:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
      });
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
