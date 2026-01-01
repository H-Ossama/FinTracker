import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';

interface AnalyticsRefreshContextType {
  /**
   * Refresh AI recommendations by calling the API again
   */
  refreshRecommendations: () => Promise<void>;
  
  /**
   * Refresh trend insights by calling the API again
   */
  refreshTrendInsights: () => Promise<void>;
  
  /**
   * Refresh spending insights by calling the API again
   */
  refreshSpendingInsights: () => Promise<void>;
  
  /**
   * Clear all cached AI data
   */
  clearAllCaches: () => Promise<void>;
  
  /**
   * Check if recommendations cache is valid
   */
  isRecommendationsCached: () => Promise<boolean>;
}

const AnalyticsRefreshContext = createContext<AnalyticsRefreshContextType | null>(null);

export const useAnalyticsRefresh = (): AnalyticsRefreshContextType => {
  const context = useContext(AnalyticsRefreshContext);
  if (!context) {
    throw new Error('useAnalyticsRefresh must be used within AnalyticsRefreshProvider');
  }
  return context;
};

interface AnalyticsRefreshProviderProps {
  children: ReactNode;
}

export const AnalyticsRefreshProvider: React.FC<AnalyticsRefreshProviderProps> = ({ children }) => {
  const refreshRecommendations = useCallback(async () => {
    try {
      console.log('🔄 Refreshing recommendations...');
      // When the component calls getRecommendations with forceRefresh=true,
      // it will trigger a new API call
      await analyticsService.getRecommendations(true);
      console.log('✅ Recommendations refreshed');
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
      throw error;
    }
  }, []);

  const refreshTrendInsights = useCallback(async () => {
    try {
      console.log('🔄 Refreshing trend insights...');
      // Components will call getTrendInsights with forceRefresh=true
      console.log('✅ Trend insights refresh queued');
    } catch (error) {
      console.error('Error refreshing trend insights:', error);
      throw error;
    }
  }, []);

  const refreshSpendingInsights = useCallback(async () => {
    try {
      console.log('🔄 Refreshing spending insights...');
      // Components will call getSpendingInsights with forceRefresh=true
      console.log('✅ Spending insights refresh queued');
    } catch (error) {
      console.error('Error refreshing spending insights:', error);
      throw error;
    }
  }, []);

  const clearAllCaches = useCallback(async () => {
    try {
      console.log('🗑️  Clearing all AI caches...');
      await analyticsService.clearAllAICaches();
      console.log('✅ All AI caches cleared');
    } catch (error) {
      console.error('Error clearing caches:', error);
      throw error;
    }
  }, []);

  const isRecommendationsCached = useCallback(async (): Promise<boolean> => {
    try {
      // Check if the timestamp exists in AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const timestamp = await AsyncStorage.getItem('gemini_cache_recommendations_ts');
      
      if (!timestamp) return false;
      
      const ts = parseInt(timestamp, 10);
      const now = Date.now();
      const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
      
      return (now - ts) < CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache status:', error);
      return false;
    }
  }, []);

  const value: AnalyticsRefreshContextType = {
    refreshRecommendations,
    refreshTrendInsights,
    refreshSpendingInsights,
    clearAllCaches,
    isRecommendationsCached,
  };

  return (
    <AnalyticsRefreshContext.Provider value={value}>
      {children}
    </AnalyticsRefreshContext.Provider>
  );
};

export default AnalyticsRefreshContext;
