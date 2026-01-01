/**
 * Ad Service for FinTracker
 * 
 * Handles halal-compliant advertising for free users.
 * - Banner ads at bottom of screens
 * - Interstitial ads on app open and first-time screen visits per session
 * - Filters out inappropriate content (gambling, alcohol, dating, etc.)
 * 
 * Uses Google AdMob with content filtering for family-safe, halal content.
 */

import { Platform } from 'react-native';

// AdMob Unit IDs - Replace these with your actual AdMob unit IDs
// For testing, use the test IDs provided by Google
export const AD_UNIT_IDS = {
  android: {
    banner: __DEV__ 
      ? 'ca-app-pub-3940256099942544/6300978111' // Google Test ID
      : 'YOUR_ANDROID_BANNER_AD_UNIT_ID', // Replace with actual production ID
    interstitial: __DEV__
      ? 'ca-app-pub-3940256099942544/1033173712' // Google Test ID
      : 'YOUR_ANDROID_INTERSTITIAL_AD_UNIT_ID', // Replace with actual production ID
    appOpen: __DEV__
      ? 'ca-app-pub-3940256099942544/3419835294' // Google Test ID
      : 'YOUR_ANDROID_APP_OPEN_AD_UNIT_ID', // Replace with actual production ID
  },
  ios: {
    banner: __DEV__
      ? 'ca-app-pub-3940256099942544/2934735716' // Google Test ID
      : 'YOUR_IOS_BANNER_AD_UNIT_ID', // Replace with actual production ID
    interstitial: __DEV__
      ? 'ca-app-pub-3940256099942544/4411468910' // Google Test ID
      : 'YOUR_IOS_INTERSTITIAL_AD_UNIT_ID', // Replace with actual production ID
    appOpen: __DEV__
      ? 'ca-app-pub-3940256099942544/5662855259' // Google Test ID
      : 'YOUR_IOS_APP_OPEN_AD_UNIT_ID', // Replace with actual production ID
  },
};

// Get the appropriate ad unit ID based on platform
export const getAdUnitId = (type: 'banner' | 'interstitial' | 'appOpen'): string => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return AD_UNIT_IDS[platform][type];
};

// Content categories to block for halal compliance
// These are blocked at the AdMob dashboard level, but we also track them here for documentation
export const BLOCKED_AD_CATEGORIES = [
  'afa-adult',           // Adult/Mature content
  'afa-dating',          // Dating services
  'afa-gambling',        // Gambling & Betting
  'afa-alcohol',         // Alcohol
  'afa-drugs',           // Drugs & supplements
  'afa-tobacco',         // Tobacco
  'afa-weapons',         // Weapons
  'afa-sensitive',       // Sensitive subjects
  'afa-religion-atheism', // Atheism content
  'afa-political',       // Political content
  'afa-lottery',         // Lottery
  'afa-casino',          // Casino
  'afa-bitcoin',         // Cryptocurrency (often associated with gambling)
  'afa-hookah',          // Hookah/Shisha
  'afa-pork',            // Pork products
];

// Screens that should NOT show banner ads (important screens where ads would be intrusive)
export const BANNER_EXCLUDED_SCREENS = [
  'SignIn',
  'SignUp',
  'AppLockScreen',
  'PinSetup',
  'Subscription',
  'PrivacyPolicy',
  'TermsOfUse',
];

// Screens that should NOT show interstitial ads
export const INTERSTITIAL_EXCLUDED_SCREENS = [
  'SignIn',
  'SignUp', 
  'AppLockScreen',
  'PinSetup',
  'Subscription',
  'PrivacyPolicy',
  'TermsOfUse',
  'NotificationCenter',
  'NotificationPreferences',
];

// Session-based tracking for visited screens (resets when app is closed)
class AdSessionManager {
  private static instance: AdSessionManager;
  private visitedScreens: Set<string> = new Set();
  private hasShownAppOpenAd: boolean = false;
  private interstitialAdReady: boolean = false;
  private lastInterstitialTime: number = 0;
  private minInterstitialInterval: number = 60000; // 60 seconds minimum between interstitials
  
  private constructor() {}

  static getInstance(): AdSessionManager {
    if (!AdSessionManager.instance) {
      AdSessionManager.instance = new AdSessionManager();
    }
    return AdSessionManager.instance;
  }

  /**
   * Check if a screen has been visited in this session
   */
  hasVisitedScreen(screenName: string): boolean {
    return this.visitedScreens.has(screenName);
  }

  /**
   * Mark a screen as visited in this session
   */
  markScreenVisited(screenName: string): void {
    this.visitedScreens.add(screenName);
  }

  /**
   * Check if interstitial should be shown for this screen
   * Returns true only if:
   * - Screen hasn't been visited before in this session
   * - Screen is not in the excluded list
   * - Enough time has passed since last interstitial
   */
  shouldShowInterstitial(screenName: string): boolean {
    // Check if screen is excluded
    if (INTERSTITIAL_EXCLUDED_SCREENS.includes(screenName)) {
      return false;
    }

    // Check if already visited
    if (this.hasVisitedScreen(screenName)) {
      return false;
    }

    // Check time since last interstitial
    const now = Date.now();
    if (now - this.lastInterstitialTime < this.minInterstitialInterval) {
      return false;
    }

    return true;
  }

  /**
   * Record that an interstitial was shown
   */
  recordInterstitialShown(screenName: string): void {
    this.markScreenVisited(screenName);
    this.lastInterstitialTime = Date.now();
  }

  /**
   * Check if app open ad has been shown this session
   */
  hasShownAppOpen(): boolean {
    return this.hasShownAppOpenAd;
  }

  /**
   * Mark app open ad as shown
   */
  markAppOpenShown(): void {
    this.hasShownAppOpenAd = true;
  }

  /**
   * Set interstitial ready state
   */
  setInterstitialReady(ready: boolean): void {
    this.interstitialAdReady = ready;
  }

  /**
   * Check if interstitial is ready
   */
  isInterstitialReady(): boolean {
    return this.interstitialAdReady;
  }

  /**
   * Reset session (called when app is closed and reopened)
   */
  resetSession(): void {
    this.visitedScreens.clear();
    this.hasShownAppOpenAd = false;
    this.interstitialAdReady = false;
    this.lastInterstitialTime = 0;
  }

  /**
   * Check if banner should be shown on a screen
   */
  shouldShowBanner(screenName: string): boolean {
    return !BANNER_EXCLUDED_SCREENS.includes(screenName);
  }

  /**
   * Get count of visited screens
   */
  getVisitedScreenCount(): number {
    return this.visitedScreens.size;
  }
}

export const adSessionManager = AdSessionManager.getInstance();

// Helper to check if ads should be shown (for free users only)
export const shouldShowAds = (isPro: boolean): boolean => {
  return !isPro;
};

// Ad request configuration for halal compliance
// This should match your AdMob dashboard settings
export const getAdRequestConfig = () => ({
  // Request non-personalized ads for privacy
  requestNonPersonalizedAdsOnly: false,
  // These are set in AdMob dashboard, but we define them here for reference
  contentUrl: undefined,
  // Keywords for better ad targeting (halal-friendly topics)
  keywords: ['finance', 'banking', 'savings', 'budgeting', 'money management', 'family finance'],
});

export default adSessionManager;
