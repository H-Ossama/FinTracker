/**
 * Code Splitting Hooks
 * Separated from JSX file to avoid TypeScript generic conflicts
 */

import { useState, useEffect } from 'react';

export interface LazyLoadOptions {
  timeout?: number;
  preload?: boolean;
  retries?: number;
}

export interface LazyLoadResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  load: () => Promise<T>;
  retry: () => void;
}

export const useLazyLoad = <T>(
  factory: () => Promise<T>,
  options: LazyLoadOptions = {}
): LazyLoadResult<T> => {
  const { timeout = 10000, preload = false, retries = 3 } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const load = async (): Promise<T> => {
    if (data) return data;
    
    setLoading(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      
      // Use Promise.race for timeout
      const result = await Promise.race([
        factory(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Load timeout')), timeout);
        })
      ]);

      setData(result);
      
      // Track performance if BundleAnalyzer is available
      if (typeof global !== 'undefined' && (global as any).BundleAnalyzer) {
        (global as any).BundleAnalyzer.trackLoad('lazy-component', startTime);
      }
      
      setRetryCount(0); // Reset retry count on success
      return result;
      
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    if (retryCount < retries) {
      setRetryCount(prev => prev + 1);
      load().catch(() => {}); // Error already handled in load function
    }
  };

  // Preload effect
  useEffect(() => {
    if (preload) {
      load().catch(() => {
        // Error already handled in load function
      });
    }
  }, [preload]);

  return {
    data,
    loading,
    error,
    load,
    retry,
  };
};