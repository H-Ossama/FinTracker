import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { SUBSCRIPTION_STORAGE_KEYS, normalizeUserKey } from '../services/subscriptionStorage';

export type SubscriptionPlanId = 'free' | 'pro';
export type BillingPeriod = 'monthly' | 'yearly';

// Pricing configuration
export const SUBSCRIPTION_PRICING = {
  monthly: {
    price: 4.99,
    displayPrice: '$4.99/month',
    billingPeriod: 'monthly' as BillingPeriod,
  },
  yearly: {
    price: 29.99,
    displayPrice: '$29.99/year',
    monthlyEquivalent: '$2.49/month',
    savings: '50%',
    billingPeriod: 'yearly' as BillingPeriod,
  },
};

// Free tier limits
export const FREE_LIMITS = {
  maxWallets: 2,
  maxTransactionsPerMonth: 50,
  maxGoals: 1,
  maxBudgets: 1,
  maxBills: 3,
  maxReminders: 3,
  cloudBackup: false,
  exportData: false,
  advancedInsights: false,
  customCategories: false,
  multiCurrency: false,
};

// Pro tier - unlimited everything
export const PRO_LIMITS = {
  maxWallets: Infinity,
  maxTransactionsPerMonth: Infinity,
  maxGoals: Infinity,
  maxBudgets: Infinity,
  maxBills: Infinity,
  maxReminders: Infinity,
  cloudBackup: true,
  exportData: true,
  advancedInsights: true,
  customCategories: true,
  multiCurrency: true,
};

export type FeatureType = 
  | 'wallets'
  | 'transactions'
  | 'goals'
  | 'budgets'
  | 'bills'
  | 'reminders'
  | 'cloudBackup'
  | 'exportData'
  | 'advancedInsights'
  | 'customCategories'
  | 'multiCurrency';

export interface SubscriptionContextType {
  isPro: boolean;
  planId: SubscriptionPlanId;
  isLoading: boolean;
  limits: typeof FREE_LIMITS;
  
  // Billing period (monthly or yearly)
  billingPeriod: BillingPeriod;
  setBillingPeriod: (period: BillingPeriod) => void;
  
  // Check if a feature is available (for boolean features)
  hasFeature: (feature: 'cloudBackup' | 'exportData' | 'advancedInsights' | 'customCategories' | 'multiCurrency') => boolean;
  
  // Check if user can add more items (for limited features)
  canAddMore: (feature: 'wallets' | 'transactions' | 'goals' | 'budgets' | 'bills' | 'reminders', currentCount: number) => boolean;
  
  // Get remaining count for a feature
  getRemainingCount: (feature: 'wallets' | 'transactions' | 'goals' | 'budgets' | 'bills' | 'reminders', currentCount: number) => number;
  
  // Get limit for a feature
  getLimit: (feature: 'wallets' | 'transactions' | 'goals' | 'budgets' | 'bills' | 'reminders') => number;
  
  // Get warning message if approaching limit
  getLimitWarning: (feature: 'wallets' | 'transactions' | 'goals' | 'budgets' | 'bills' | 'reminders', currentCount: number) => string | null;
  
  // Upgrade to pro (for future payment integration)
  upgradeToPro: () => Promise<void>;

  // Set plan (frontend-only; for future billing integration)
  setPlan: (planId: SubscriptionPlanId) => Promise<void>;
  
  // Dev testing toggle
  toggleProForTesting: () => Promise<void>;
  
  // Show the upgrade modal (with session tracking)
  showUpgradeModal: (feature?: FeatureType, message?: string) => void;
  hideUpgradeModal: () => void;
  
  // Check if paywall was already shown for feature this session
  wasPaywallShownForFeature: (feature: FeatureType) => boolean;
  
  // Modal state
  upgradeModalVisible: boolean;
  upgradeModalFeature?: FeatureType;
  upgradeModalMessage?: string;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

let hasWarnedMissingProvider = false;

const fallbackSubscriptionContext: SubscriptionContextType = {
  isPro: false,
  planId: 'free',
  isLoading: false,
  limits: FREE_LIMITS,
  billingPeriod: 'yearly',
  setBillingPeriod: () => {},
  hasFeature: () => false,
  canAddMore: () => true,
  getRemainingCount: (_feature, _currentCount) => Infinity,
  getLimit: () => Infinity,
  getLimitWarning: () => null,
  upgradeToPro: async () => {
    // no-op fallback
  },
  setPlan: async () => {
    // no-op fallback
  },
  toggleProForTesting: async () => {
    // no-op fallback
  },
  showUpgradeModal: () => {
    // no-op fallback
  },
  hideUpgradeModal: () => {
    // no-op fallback
  },
  wasPaywallShownForFeature: () => false,
  upgradeModalVisible: false,
  upgradeModalFeature: undefined,
  upgradeModalMessage: undefined,
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    if (!hasWarnedMissingProvider) {
      hasWarnedMissingProvider = true;
      console.warn('useSubscription used without SubscriptionProvider; falling back to FREE plan.');
    }
    return fallbackSubscriptionContext;
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [planId, setPlanId] = useState<SubscriptionPlanId>('free');
  const [billingPeriod, setBillingPeriodState] = useState<BillingPeriod>('yearly');
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<FeatureType | undefined>();
  const [upgradeModalMessage, setUpgradeModalMessage] = useState<string | undefined>();
  
  // Session-based tracking for paywalls shown
  const shownPaywallsThisSession = useRef<Set<FeatureType>>(new Set());

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      const userKey = normalizeUserKey(user?.id || user?.email);

      // If not authenticated, always fall back to Free.
      if (!isAuthenticated || !userKey) {
        setIsPro(false);
        setPlanId('free');
        setBillingPeriodState('yearly');
        return;
      }

      // Reset session paywall tracking on account switch.
      shownPaywallsThisSession.current = new Set();

      const ownerUserKey = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEYS.legacy.OWNER_USER_ID);

      // User-scoped keys
      const devOverrideKey = SUBSCRIPTION_STORAGE_KEYS.devOverride(userKey);
      const proStatusKey = SUBSCRIPTION_STORAGE_KEYS.proStatus(userKey);
      const billingPeriodKey = SUBSCRIPTION_STORAGE_KEYS.billingPeriod(userKey);

      // Migration path (from old device-wide keys): only migrate if owner matches current user.
      const [existingDevOverride, existingProStatus, existingBillingPeriod] = await AsyncStorage.multiGet([
        devOverrideKey,
        proStatusKey,
        billingPeriodKey,
      ]);

      const hasAnyUserScopedValue =
        existingDevOverride[1] !== null || existingProStatus[1] !== null || existingBillingPeriod[1] !== null;

      if (!hasAnyUserScopedValue && ownerUserKey && ownerUserKey === userKey) {
        const [legacyDevOverride, legacyProStatus, legacyBilling] = await AsyncStorage.multiGet([
          SUBSCRIPTION_STORAGE_KEYS.legacy.DEV_OVERRIDE,
          SUBSCRIPTION_STORAGE_KEYS.legacy.PRO_STATUS,
          SUBSCRIPTION_STORAGE_KEYS.legacy.BILLING_PERIOD,
        ]);

        const toSet: Array<[string, string]> = [];
        if (legacyDevOverride[1] !== null) toSet.push([devOverrideKey, legacyDevOverride[1]]);
        if (legacyProStatus[1] !== null) toSet.push([proStatusKey, legacyProStatus[1]]);
        if (legacyBilling[1] !== null) toSet.push([billingPeriodKey, legacyBilling[1]]);

        if (toSet.length > 0) {
          await AsyncStorage.multiSet(toSet);
        }
      }

      // Check for dev override first (user-scoped)
      const devOverride = await AsyncStorage.getItem(devOverrideKey);
      if (devOverride === 'true') {
        setIsPro(true);
        setPlanId('pro');
        return;
      }

      // Check subscription status (user-scoped)
      const proStatus = await AsyncStorage.getItem(proStatusKey);
      const nextIsPro = proStatus === 'true';
      setIsPro(nextIsPro);
      setPlanId(nextIsPro ? 'pro' : 'free');

      // Load billing period preference (user-scoped)
      const savedBillingPeriod = await AsyncStorage.getItem(billingPeriodKey);
      if (savedBillingPeriod === 'monthly' || savedBillingPeriod === 'yearly') {
        setBillingPeriodState(savedBillingPeriod);
      } else {
        setBillingPeriodState('yearly');
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
      setIsPro(false);
      setPlanId('free');
      setBillingPeriodState('yearly');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.email, user?.id]);

  // Load subscription status on mount and when user changes
  useEffect(() => {
    setIsLoading(true);
    loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  const limits = isPro ? PRO_LIMITS : FREE_LIMITS;
  
  const setBillingPeriod = useCallback((period: BillingPeriod) => {
    setBillingPeriodState(period);
    const userKey = normalizeUserKey(user?.id || user?.email);
    if (!isAuthenticated || !userKey) return;
    AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEYS.billingPeriod(userKey), period).catch(console.error);
  }, [isAuthenticated, user?.email, user?.id]);

  const hasFeature = useCallback((feature: 'cloudBackup' | 'exportData' | 'advancedInsights' | 'customCategories' | 'multiCurrency'): boolean => {
    return limits[feature];
  }, [limits]);

  const canAddMore = useCallback((feature: 'wallets' | 'transactions' | 'goals' | 'budgets' | 'bills' | 'reminders', currentCount: number): boolean => {
    const limitMap: Record<string, keyof typeof limits> = {
      wallets: 'maxWallets',
      transactions: 'maxTransactionsPerMonth',
      goals: 'maxGoals',
      budgets: 'maxBudgets',
      bills: 'maxBills',
      reminders: 'maxReminders',
    };
    
    const limitKey = limitMap[feature];
    const limit = limits[limitKey] as number;
    return currentCount < limit;
  }, [limits]);

  const getRemainingCount = useCallback((feature: 'wallets' | 'transactions' | 'goals' | 'budgets' | 'bills' | 'reminders', currentCount: number): number => {
    const limitMap: Record<string, keyof typeof limits> = {
      wallets: 'maxWallets',
      transactions: 'maxTransactionsPerMonth',
      goals: 'maxGoals',
      budgets: 'maxBudgets',
      bills: 'maxBills',
      reminders: 'maxReminders',
    };
    
    const limitKey = limitMap[feature];
    const limit = limits[limitKey] as number;
    
    if (limit === Infinity) return Infinity;
    return Math.max(0, limit - currentCount);
  }, [limits]);

  const getLimit = useCallback((feature: 'wallets' | 'transactions' | 'goals' | 'budgets' | 'bills' | 'reminders'): number => {
    const limitMap: Record<string, keyof typeof limits> = {
      wallets: 'maxWallets',
      transactions: 'maxTransactionsPerMonth',
      goals: 'maxGoals',
      budgets: 'maxBudgets',
      bills: 'maxBills',
      reminders: 'maxReminders',
    };
    
    const limitKey = limitMap[feature];
    return limits[limitKey] as number;
  }, [limits]);

  // Get warning message if approaching limit (for pre-emptive warnings)
  const getLimitWarning = useCallback((feature: 'wallets' | 'transactions' | 'goals' | 'budgets' | 'bills' | 'reminders', currentCount: number): string | null => {
    if (isPro) return null;
    
    const warningThresholds: Record<string, number> = {
      wallets: 2,      // Warn at limit
      transactions: 45, // Warn 5 before limit
      goals: 1,        // Warn at limit
      budgets: 1,      // Warn at limit
      bills: 3,        // Warn at limit
      reminders: 3,    // Warn at limit
    };
    
    const limit = getLimit(feature);
    const threshold = warningThresholds[feature];
    
    if (currentCount >= threshold && currentCount < limit) {
      const remaining = limit - currentCount;
      return `${remaining} ${feature} remaining`;
    }
    
    return null;
  }, [isPro, getLimit]);

  const setPlan = useCallback(async (nextPlanId: SubscriptionPlanId): Promise<void> => {
    // TODO: Integrate with actual payment system (RevenueCat, Stripe, etc.)
    // For now, just store locally for UI/demo purposes.
    try {
      const userKey = normalizeUserKey(user?.id || user?.email);
      if (!isAuthenticated || !userKey) {
        // App does not support subscriptions while logged out.
        setIsPro(false);
        setPlanId('free');
        return;
      }

      // Track which user owns legacy device-wide subscription flags (for safe migrations).
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEYS.legacy.OWNER_USER_ID, userKey);

      // Clear dev override when explicitly selecting a plan.
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEYS.devOverride(userKey), 'false');
      const nextIsPro = nextPlanId === 'pro';
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEYS.proStatus(userKey), nextIsPro ? 'true' : 'false');
      setIsPro(nextIsPro);
      setPlanId(nextPlanId);
      setUpgradeModalVisible(false);
    } catch (error) {
      console.error('Error setting subscription plan:', error);
      throw error;
    }
  }, [isAuthenticated, user?.email, user?.id]);

  const upgradeToPro = useCallback(async (): Promise<void> => {
    await setPlan('pro');
  }, [setPlan]);

  const toggleProForTesting = useCallback(async (): Promise<void> => {
    try {
      const userKey = normalizeUserKey(user?.id || user?.email);
      if (!isAuthenticated || !userKey) return;

      const newStatus = !isPro;
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEYS.legacy.OWNER_USER_ID, userKey);
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEYS.devOverride(userKey), newStatus ? 'true' : 'false');
      setIsPro(newStatus);
      setPlanId(newStatus ? 'pro' : 'free');
    } catch (error) {
      console.error('Error toggling pro for testing:', error);
    }
  }, [isAuthenticated, isPro, user?.email, user?.id]);

  const showUpgradeModal = useCallback((feature?: FeatureType, message?: string) => {
    // Session-based tracking: don't show same paywall twice per session
    if (feature && shownPaywallsThisSession.current.has(feature)) {
      console.log(`Paywall for ${feature} already shown this session, skipping`);
      return;
    }
    
    if (feature) {
      shownPaywallsThisSession.current.add(feature);
    }
    
    setUpgradeModalFeature(feature);
    setUpgradeModalMessage(message);
    setUpgradeModalVisible(true);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setUpgradeModalVisible(false);
    setUpgradeModalFeature(undefined);
    setUpgradeModalMessage(undefined);
  }, []);
  
  const wasPaywallShownForFeature = useCallback((feature: FeatureType): boolean => {
    return shownPaywallsThisSession.current.has(feature);
  }, []);

  const value: SubscriptionContextType = {
    isPro,
    planId,
    isLoading,
    limits,
    billingPeriod,
    setBillingPeriod,
    hasFeature,
    canAddMore,
    getRemainingCount,
    getLimit,
    getLimitWarning,
    upgradeToPro,
    setPlan,
    toggleProForTesting,
    showUpgradeModal,
    hideUpgradeModal,
    wasPaywallShownForFeature,
    upgradeModalVisible,
    upgradeModalFeature,
    upgradeModalMessage,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
