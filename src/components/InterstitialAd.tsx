/**
 * Interstitial Ad Hook (real AdMob)
 *
 * Uses react-native-google-mobile-ads to show a native full-screen interstitial.
 * Session gating (once per screen per session) is handled via AdContext/adService.
 */

import React, { useCallback, useRef } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { useAds } from '../contexts/AdContext';
import { getAdUnitId } from '../services/adService';

/**
 * Custom hook to manage interstitial ads for a screen
 * 
 * Usage:
 * const { showInterstitialIfNeeded, InterstitialComponent } = useInterstitialAd('ScreenName');
 * 
 * useEffect(() => {
 *   showInterstitialIfNeeded();
 * }, []);
 * 
 * return (
 *   <>
 *     <YourScreenContent />
 *     <InterstitialComponent />
 *   </>
 * );
 */
export const useInterstitialAd = (screenName: string) => {
  const { adsEnabled, shouldShowInterstitial, recordInterstitialShown } = useAds();
  const hasChecked = useRef(false);
  const isShowing = useRef(false);

  const showInterstitialIfNeeded = useCallback(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    if (!adsEnabled || !shouldShowInterstitial(screenName) || isShowing.current) return;

    isShowing.current = true;

    const interstitial = InterstitialAd.createForAdRequest(getAdUnitId('interstitial'), {
      requestNonPersonalizedAdsOnly: false,
      keywords: ['finance', 'budgeting', 'saving', 'banking', 'family'],
    });

    const unsubscribe = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribe();
      isShowing.current = false;
    });

    interstitial.addAdEventListener(AdEventType.ERROR, () => {
      try {
        unsubscribe();
      } catch {}
      isShowing.current = false;
    });

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      // Treat the interstitial as "consumed" for this screen/session once it's ready to show.
      // This matches the requirement: only once per screen per session (even if user navigates back).
      recordInterstitialShown(screenName);
      interstitial.show().catch(() => {
        isShowing.current = false;
      });
    });

    interstitial.load();
  }, [adsEnabled, recordInterstitialShown, screenName, shouldShowInterstitial]);

  const InterstitialComponent = useCallback(() => null, []);

  return {
    showInterstitialIfNeeded,
    InterstitialComponent,
    isShowingAd: false,
  };
};

export default useInterstitialAd;
