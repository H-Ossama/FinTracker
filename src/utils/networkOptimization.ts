/**
 * Network and API Optimization Utilities
 * Provides request caching, debouncing, retry logic, and efficient data loading
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define NetInfo type for optional dependency
interface NetInfoState {
  isConnected: boolean | null;
  type: string;
}

// Optional NetInfo import (will be undefined if not installed)
let NetInfo: any;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (error) {
  console.log('NetInfo not available - network monitoring disabled');
}

// Request cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
  compression: boolean; // Whether to compress cached data
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  compression: true,
};

// Request cache implementation
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private config: CacheConfig;
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }
  
  set(key: string, data: any, customTtl?: number): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data: this.config.compression ? this.compress(data) : data,
      timestamp: Date.now(),
      ttl: customTtl || this.config.ttl,
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return this.config.compression ? this.decompress(item.data) : item.data;
  }
  
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  private compress(data: any): string {
    // Simple compression using JSON.stringify
    // In a real app, you might want to use a proper compression library
    return JSON.stringify(data);
  }
  
  private decompress(data: string): any {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  
  // Get cache statistics
  getStats(): { size: number; hitRate: number } {
    // This is a simplified implementation
    // In a real app, you'd track hits/misses
    return {
      size: this.cache.size,
      hitRate: 0.8, // Mock hit rate
    };
  }
}

// Global request cache instance
const requestCache = new RequestCache();

// Request deduplication manager
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }
    
    // Create new request and track it
    const promise = requestFn().finally(() => {
      // Remove from pending requests when done
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
  
  clear(): void {
    this.pendingRequests.clear();
  }
}

const requestDeduplicator = new RequestDeduplicator();

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition: (error: any) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors or 5xx status codes
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  },
};

// Optimized fetch with caching, retry, and deduplication
export const optimizedFetch = async <T>(
  url: string,
  options: RequestInit & {
    cache?: boolean;
    cacheTtl?: number;
    retry?: Partial<RetryConfig>;
    timeout?: number;
  } = {}
): Promise<T> => {
  const {
    cache = true,
    cacheTtl,
    retry: retryOptions,
    timeout = 10000,
    ...fetchOptions
  } = options;
  
  const cacheKey = `${url}_${JSON.stringify(fetchOptions)}`;
  
  // Check cache first
  if (cache && requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }
  
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryOptions };
  
  const executeRequest = async (): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful response
      if (cache) {
        requestCache.set(cacheKey, data, cacheTtl);
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
  
  const executeWithRetry = async (attempt: number = 0): Promise<T> => {
    try {
      return await executeRequest();
    } catch (error) {
      if (attempt >= retryConfig.maxRetries || !retryConfig.retryCondition(error)) {
        throw error;
      }
      
      const delay = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffFactor, attempt),
        retryConfig.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWithRetry(attempt + 1);
    }
  };
  
  // Use deduplication to prevent multiple identical requests
  return requestDeduplicator.deduplicate(cacheKey, executeWithRetry);
};

// Network manager for offline support
export class NetworkManager {
  private static instance: NetworkManager;
  private isOnline = true;
  private offlineQueue: Array<() => Promise<any>> = [];
  
  private constructor() {
    this.setupNetworkListener();
  }
  
  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }
  
  private setupNetworkListener(): void {
    NetInfo?.addEventListener((state: NetInfoState) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;
      
      // Process offline queue when coming back online
      if (wasOffline && this.isOnline) {
        this.processOfflineQueue();
      }
    });
  }
  
  private async processOfflineQueue(): Promise<void> {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const request of queue) {
      try {
        await request();
      } catch (error) {
        console.warn('Failed to process offline request:', error);
      }
    }
  }
  
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }
  
  queueForOffline(request: () => Promise<any>): void {
    this.offlineQueue.push(request);
  }
  
  clearOfflineQueue(): void {
    this.offlineQueue = [];
  }
}

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = NetInfo?.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected || false);
      setIsLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  return { isOnline, isLoading };
};

// Hook for optimized API requests
export const useOptimizedRequest = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const networkManager = NetworkManager.getInstance();
  
  const execute = useCallback(async (
    url: string,
    options?: Parameters<typeof optimizedFetch>[1]
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!networkManager.isNetworkAvailable()) {
        throw new Error('No network connection');
      }
      
      const result = await optimizedFetch<T>(url, options);
      setData(result);
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, [networkManager]);
  
  return { data, loading, error, execute };
};

// Debounced request hook
export const useDebouncedRequest = <T>(
  delay: number = 300
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const execute = useCallback((
    url: string,
    options?: Parameters<typeof optimizedFetch>[1]
  ) => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setLoading(true);
    setError(null);
    
    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await optimizedFetch<T>(url, options);
        setData(result);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [delay]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return { data, loading, error, execute };
};

// Initialize network optimization
export const initializeNetworkOptimization = (): void => {
  NetworkManager.getInstance();
  
  if (__DEV__) {
    console.log('🌐 Network optimization initialized');
    console.log('📊 Cache stats:', requestCache.getStats());
  }
};

// Network utilities
export const NetworkUtils = {
  // Clear all caches
  clearCache: () => {
    requestCache.clear();
    requestDeduplicator.clear();
  },
  
  // Get cache statistics
  getCacheStats: () => requestCache.getStats(),
  
  // Get network manager instance
  getNetworkManager: () => NetworkManager.getInstance(),
};

export default {
  optimizedFetch,
  NetworkManager,
  useNetworkStatus,
  useOptimizedRequest,
  useDebouncedRequest,
  NetworkUtils,
};