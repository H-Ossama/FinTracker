import { useEffect, useState, useCallback } from 'react';
import {
  SpendingData,
  TrendData,
  analyticsService,
} from '../services/analyticsService';
import { useAnalyticsRefresh } from '../contexts/AnalyticsRefreshContext';

interface UseAIInsightsOptions {
  autoFetch?: boolean;
}

/**
 * Hook to fetch AI insights for spending and trends
 * Provides automatic caching and manual refresh capability
 */
export const useAIInsights = (options: UseAIInsightsOptions = { autoFetch: true }) => {
  const [spendingInsight, setSpendingInsight] = useState<string>('');
  const [trendInsight, setTrendInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshSpendingInsights, refreshTrendInsights } = useAnalyticsRefresh();

  /**
   * Fetch spending insights
   */
  const fetchSpendingInsights = useCallback(
    async (spendingData: SpendingData, forceRefresh = false) => {
      try {
        setIsLoading(true);
        const insight = await analyticsService.getSpendingInsights(
          spendingData,
          forceRefresh
        );
        setSpendingInsight(insight);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch insights';
        setError(message);
        console.error('Error fetching spending insights:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Fetch trend insights
   */
  const fetchTrendInsights = useCallback(
    async (trendData: TrendData, forceRefresh = false) => {
      try {
        setIsLoading(true);
        const insight = await analyticsService.getTrendInsights(
          trendData,
          forceRefresh
        );
        setTrendInsight(insight);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch insights';
        setError(message);
        console.error('Error fetching trend insights:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Refresh both insights by calling API again
   */
  const refreshAllInsights = useCallback(
    async (spendingData?: SpendingData, trendData?: TrendData) => {
      try {
        setIsLoading(true);
        setError(null);

        const promises = [];

        if (spendingData) {
          promises.push(fetchSpendingInsights(spendingData, true));
        }
        if (trendData) {
          promises.push(fetchTrendInsights(trendData, true));
        }

        await Promise.all(promises);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to refresh insights';
        setError(message);
        console.error('Error refreshing insights:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSpendingInsights, fetchTrendInsights]
  );

  return {
    spendingInsight,
    trendInsight,
    isLoading,
    error,
    fetchSpendingInsights,
    fetchTrendInsights,
    refreshAllInsights,
  };
};

export default useAIInsights;
