/**
 * Ad Context Provider for FinTracker
 * 
 * Manages ad state and provides ad-related functions throughout the app.
 * Handles:
 * - Session tracking for screen visits
 * - Interstitial ad loading and showing
 * - App open ad on first launch
 * - Banner visibility control
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useRef,
  ReactNode 
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { useSubscription } from './SubscriptionContext';
import adSessionManager, { 
  shouldShowAds, 
} from '../services/adService';

interface AdContextType {
  // Whether ads should be shown (user is on free plan)
  adsEnabled: boolean;
  
  // Whether banner should be shown on current screen
  shouldShowBanner: (screenName: string) => boolean;
  
  // Check if interstitial should be shown for a screen
  shouldShowInterstitial: (screenName: string) => boolean;
  
  // Record that an interstitial was shown
  recordInterstitialShown: (screenName: string) => void;
  
  // Check if app open ad should be shown
  shouldShowAppOpenAd: () => boolean;
  
  // Record that app open ad was shown
  recordAppOpenAdShown: () => void;
  
  // Interstitial loading state
  isInterstitialLoading: boolean;
  isInterstitialReady: boolean;
  
  // Request to load an interstitial
  loadInterstitial: () => void;
  
  // Show the loaded interstitial (if ready)
  showInterstitial: (screenName: string) => Promise<boolean>;
  
  // Banner height for layout calculations
  bannerHeight: number;
  
  // App open ad shown state
  hasShownAppOpenAd: boolean;
}

const AdContext = createContext<AdContextType | null>(null);

// Fallback context for when provider is not available
const fallbackContext: AdContextType = {
  adsEnabled: false,
  shouldShowBanner: () => false,
  shouldShowInterstitial: () => false,
  recordInterstitialShown: () => {},
  shouldShowAppOpenAd: () => false,
  recordAppOpenAdShown: () => {},
  isInterstitialLoading: false,
  isInterstitialReady: false,
  loadInterstitial: () => {},
  showInterstitial: async () => false,
  bannerHeight: 0,
  hasShownAppOpenAd: true,
};

export const useAds = (): AdContextType => {
  const context = useContext(AdContext);
  if (!context) {
    console.warn('useAds used without AdProvider; ads will be disabled.');
    return fallbackContext;
  }
  return context;
};

interface AdProviderProps {
  children: ReactNode;
}

export const AdProvider: React.FC<AdProviderProps> = ({ children }) => {
  const { isPro } = useSubscription();
  const [adsEnabled, setAdsEnabled] = useState(!isPro);
  const [isInterstitialLoading, setIsInterstitialLoading] = useState(false);
  const [isInterstitialReady, setIsInterstitialReady] = useState(false);
  const [hasShownAppOpenAd, setHasShownAppOpenAd] = useState(false);
  const appState = useRef(AppState.currentState);
  const isFirstLaunch = useRef(true);
  const hasInitializedMobileAds = useRef(false);

  // Standard banner height (50 on phones, 90 on tablets)
  const bannerHeight = Platform.OS === 'ios' ? 50 : 50;

  // Update ads enabled state when subscription changes
  useEffect(() => {
    const shouldEnable = shouldShowAds(isPro);
    setAdsEnabled(shouldEnable);
    
    if (!shouldEnable) {
      // Reset ad states when user upgrades to Pro
      setIsInterstitialReady(false);
      setIsInterstitialLoading(false);
    }
  }, [isPro]);

  // Configure global request settings for halal/family-safe ads.
  // Note: maxAdContentRating is configured globally (not per-request).
  useEffect(() => {
    if (!adsEnabled) return;
    if (!hasInitializedMobileAds.current) {
      hasInitializedMobileAds.current = true;
      mobileAds().initialize().catch(() => {
        // Ignore init errors; ad requests will still attempt.
      });
    }
    mobileAds()
      .setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        ...(typeof __DEV__ !== 'undefined' && __DEV__
          ? { testDeviceIdentifiers: ['EMULATOR'] }
          : null),
      })
      .catch(() => {
        // Ignore configuration errors; ads will still attempt to load.
      });
  }, [adsEnabled]);

  // Handle app state changes to reset session when app is fully closed
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // When app comes to foreground from being terminated (not just backgrounded)
      // This is detected when app was in 'unknown' state before
      if (appState.current === 'unknown' && nextAppState === 'active') {
        // App was just opened fresh - reset session
        adSessionManager.resetSession();
        isFirstLaunch.current = true;
        setHasShownAppOpenAd(false);
      }
      
      // When app comes back from background to active
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came back from background - check if we should show app open ad
        // Only show if it's been a while (e.g., more than 30 seconds in background)
        // For now, we only show on fresh launch, not when coming back from background
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const shouldShowBanner = useCallback((screenName: string): boolean => {
    if (!adsEnabled) return false;
    return adSessionManager.shouldShowBanner(screenName);
  }, [adsEnabled]);

  const shouldShowInterstitial = useCallback((screenName: string): boolean => {
    if (!adsEnabled) return false;
    return adSessionManager.shouldShowInterstitial(screenName);
  }, [adsEnabled]);

  const recordInterstitialShown = useCallback((screenName: string): void => {
    adSessionManager.recordInterstitialShown(screenName);
  }, []);

  const shouldShowAppOpenAd = useCallback((): boolean => {
    if (!adsEnabled) return false;
    if (hasShownAppOpenAd) return false;
    return !adSessionManager.hasShownAppOpen();
  }, [adsEnabled, hasShownAppOpenAd]);

  const recordAppOpenAdShown = useCallback((): void => {
    adSessionManager.markAppOpenShown();
    setHasShownAppOpenAd(true);
  }, []);

  const loadInterstitial = useCallback((): void => {
    if (!adsEnabled || isInterstitialLoading || isInterstitialReady) return;
    
    setIsInterstitialLoading(true);
    
    // In a real implementation, this would load an actual ad
    // For now, we simulate the loading process
    // The actual implementation will be in the AdBanner component
    setTimeout(() => {
      setIsInterstitialLoading(false);
      setIsInterstitialReady(true);
      adSessionManager.setInterstitialReady(true);
    }, 1000);
  }, [adsEnabled, isInterstitialLoading, isInterstitialReady]);

  const showInterstitial = useCallback(async (screenName: string): Promise<boolean> => {
    if (!adsEnabled) return false;
    if (!shouldShowInterstitial(screenName)) return false;
    
    // In a real implementation, this would show the actual ad
    // For now, we just record that it was shown
    recordInterstitialShown(screenName);
    setIsInterstitialReady(false);
    adSessionManager.setInterstitialReady(false);
    
    // Preload next interstitial
    setTimeout(() => {
      loadInterstitial();
    }, 1000);
    
    return true;
  }, [adsEnabled, shouldShowInterstitial, recordInterstitialShown, loadInterstitial]);

  const value: AdContextType = {
    adsEnabled,
    shouldShowBanner,
    shouldShowInterstitial,
    recordInterstitialShown,
    shouldShowAppOpenAd,
    recordAppOpenAdShown,
    isInterstitialLoading,
    isInterstitialReady,
    loadInterstitial,
    showInterstitial,
    bannerHeight,
    hasShownAppOpenAd,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
};

export default AdContext;
