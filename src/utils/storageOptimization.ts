/**
 * Database and Storage Optimization Utilities
 * Provides efficient data caching, query optimization, and storage management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration
const CACHE_CONFIG = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // Maximum number of cached items
  compressionThreshold: 1024, // Compress items larger than 1KB
};

// In-memory cache for frequently accessed data
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; hits: number }>();
  private maxSize = CACHE_CONFIG.maxSize;
  private maxAge = CACHE_CONFIG.maxAge;

  set(key: string, data: any): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item has expired
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count for LRU eviction
    item.hits++;
    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    let lowestHits = Infinity;

    for (const [key, item] of this.cache.entries()) {
      // Prioritize by age, then by hit count
      if (item.timestamp < oldestTime || 
          (item.timestamp === oldestTime && item.hits < lowestHits)) {
        oldestKey = key;
        oldestTime = item.timestamp;
        lowestHits = item.hits;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  getStats(): { size: number; hitRate: number } {
    let totalHits = 0;
    let totalItems = 0;

    for (const item of this.cache.values()) {
      totalHits += item.hits;
      totalItems++;
    }

    return {
      size: this.cache.size,
      hitRate: totalItems > 0 ? totalHits / totalItems : 0,
    };
  }
}

// Global memory cache instance
const memoryCache = new MemoryCache();

// Optimized AsyncStorage operations
export class OptimizedStorage {
  private static compressionEnabled = true;
  private static batchOperations: Array<{ key: string; value: any; operation: 'set' | 'remove' }> = [];
  private static batchTimeout: NodeJS.Timeout | null = null;

  // Get data with caching
  static async get<T>(key: string, useCache = true): Promise<T | null> {
    try {
      // Check memory cache first
      if (useCache && memoryCache.has(key)) {
        return memoryCache.get(key);
      }

      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;

      const parsed = JSON.parse(value);
      
      // Handle compressed data
      if (parsed._compressed) {
        // For now, we'll just store the flag but not actually compress
        // In a real implementation, you'd use a compression library
        const data = parsed.data;
        if (useCache) {
          memoryCache.set(key, data);
        }
        return data;
      }

      if (useCache) {
        memoryCache.set(key, parsed);
      }
      return parsed;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  }

  // Set data with optional compression and batching
  static async set(key: string, value: any, options: { 
    useCache?: boolean; 
    compress?: boolean; 
    batch?: boolean 
  } = {}): Promise<void> {
    const { useCache = true, compress = false, batch = false } = options;

    try {
      // Update memory cache immediately
      if (useCache) {
        memoryCache.set(key, value);
      }

      if (batch) {
        // Add to batch operations
        this.batchOperations.push({ key, value, operation: 'set' });
        this.scheduleBatchExecution();
        return;
      }

      await this.setImmediate(key, value, compress);
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
    }
  }

  private static async setImmediate(key: string, value: any, compress: boolean): Promise<void> {
    const serialized = JSON.stringify(value);
    
    let finalValue: string;
    
    if (compress && serialized.length > CACHE_CONFIG.compressionThreshold) {
      // Mark as compressed (in real implementation, you'd actually compress here)
      finalValue = JSON.stringify({
        _compressed: true,
        data: value,
      });
    } else {
      finalValue = serialized;
    }

    await AsyncStorage.setItem(key, finalValue);
  }

  // Remove data
  static async remove(key: string, batch = false): Promise<void> {
    try {
      memoryCache.delete(key);

      if (batch) {
        this.batchOperations.push({ key, value: null, operation: 'remove' });
        this.scheduleBatchExecution();
        return;
      }

      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  }

  // Batch operations for better performance
  private static scheduleBatchExecution(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.executeBatch();
    }, 100); // Batch operations within 100ms window
  }

  private static async executeBatch(): Promise<void> {
    if (this.batchOperations.length === 0) return;

    const operations = [...this.batchOperations];
    this.batchOperations = [];

    try {
      const promises = operations.map(async (op) => {
        if (op.operation === 'set') {
          return this.setImmediate(op.key, op.value, false);
        } else {
          return AsyncStorage.removeItem(op.key);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error executing batch operations:', error);
    }
  }

  // Get multiple keys efficiently
  static async getMultiple<T>(keys: string[], useCache = true): Promise<Array<[string, T | null]>> {
    try {
      const results: Array<[string, T | null]> = [];
      const keysToFetch: string[] = [];

      // Check cache first
      for (const key of keys) {
        if (useCache && memoryCache.has(key)) {
          results.push([key, memoryCache.get(key)]);
        } else {
          keysToFetch.push(key);
        }
      }

      if (keysToFetch.length > 0) {
        const storageResults = await AsyncStorage.multiGet(keysToFetch);
        
        for (const [key, value] of storageResults) {
          let parsed: T | null = null;
          
          if (value !== null) {
            try {
              const data = JSON.parse(value);
              parsed = data._compressed ? data.data : data;
              
              if (useCache) {
                memoryCache.set(key, parsed);
              }
            } catch (error) {
              console.error(`Error parsing ${key}:`, error);
            }
          }
          
          results.push([key, parsed]);
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting multiple keys:', error);
      return keys.map(key => [key, null]);
    }
  }

  // Set multiple keys efficiently
  static async setMultiple(keyValuePairs: Array<[string, any]>, useCache = true): Promise<void> {
    try {
      // Update cache
      if (useCache) {
        for (const [key, value] of keyValuePairs) {
          memoryCache.set(key, value);
        }
      }

      // Prepare for storage
      const storageData: [string, string][] = keyValuePairs.map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]);

      await AsyncStorage.multiSet(storageData);
    } catch (error) {
      console.error('Error setting multiple keys:', error);
    }
  }

  // Clear all data
  static async clear(): Promise<void> {
    try {
      memoryCache.clear();
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Get storage size and statistics
  static async getStorageInfo(): Promise<{
    keys: string[];
    size: number;
    cacheStats: { size: number; hitRate: number };
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      // Estimate size (not exact, but gives a good indication)
      if (keys.length > 0) {
        const values = await AsyncStorage.multiGet(keys);
        totalSize = values.reduce((acc, [_, value]) => {
          return acc + (value ? value.length : 0);
        }, 0);
      }

      return {
        keys: [...keys],
        size: totalSize,
        cacheStats: memoryCache.getStats(),
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { keys: [], size: 0, cacheStats: { size: 0, hitRate: 0 } };
    }
  }

  // Cleanup old data based on patterns
  static async cleanup(patterns: string[] = [], maxAge?: number): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove: string[] = [];

      for (const key of keys) {
        let shouldRemove = false;

        // Check patterns
        for (const pattern of patterns) {
          if (key.includes(pattern)) {
            shouldRemove = true;
            break;
          }
        }

        // Check age if maxAge is provided
        if (!shouldRemove && maxAge) {
          try {
            const value = await AsyncStorage.getItem(key);
            if (value) {
              const data = JSON.parse(value);
              if (data.timestamp && Date.now() - data.timestamp > maxAge) {
                shouldRemove = true;
              }
            }
          } catch {
            // If parsing fails, consider it old data
            shouldRemove = true;
          }
        }

        if (shouldRemove) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} storage keys`);
      }
    } catch (error) {
      console.error('Error during storage cleanup:', error);
    }
  }
}

// Database query optimization utilities
export class QueryOptimizer {
  private static queryCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly QUERY_CACHE_TTL = 30000; // 30 seconds

  // Cache query results
  static cacheQuery(queryKey: string, data: any): void {
    this.queryCache.set(queryKey, {
      data,
      timestamp: Date.now(),
    });
  }

  // Get cached query result
  static getCachedQuery(queryKey: string): any | null {
    const cached = this.queryCache.get(queryKey);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.QUERY_CACHE_TTL) {
      this.queryCache.delete(queryKey);
      return null;
    }

    return cached.data;
  }

  // Create optimized query key
  static createQueryKey(operation: string, params: any = {}): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  // Clear query cache
  static clearQueryCache(): void {
    this.queryCache.clear();
  }

  // Batch database operations
  static async batchOperations<T>(
    operations: Array<() => Promise<T>>
  ): Promise<T[]> {
    // Execute operations in smaller batches to avoid overwhelming the database
    const batchSize = 10;
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }

    return results;
  }
}

// Storage monitoring and optimization
export class StorageMonitor {
  private static isMonitoring = false;
  private static monitorInterval: NodeJS.Timeout | null = null;

  static startMonitoring(interval = 60000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(async () => {
      try {
        const info = await OptimizedStorage.getStorageInfo();
        
        // Log storage stats in development
        if (__DEV__) {
          console.log('📊 Storage Stats:', {
            keys: info.keys.length,
            estimatedSize: `${(info.size / 1024).toFixed(2)}KB`,
            cacheHitRate: `${(info.cacheStats.hitRate * 100).toFixed(1)}%`,
          });
        }

        // Auto-cleanup if storage is getting large
        if (info.size > 1024 * 1024) { // > 1MB
          await OptimizedStorage.cleanup(['temp_', 'cache_'], 24 * 60 * 60 * 1000); // 24 hours
        }
      } catch (error) {
        console.error('Storage monitoring error:', error);
      }
    }, interval);
  }

  static stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }
}

// Export main cache instance for direct access
export { memoryCache };

// Initialize storage optimization
export const initializeStorageOptimization = (): void => {
  // Start monitoring in development
  if (__DEV__) {
    StorageMonitor.startMonitoring();
  }

  // Clean up old data on app start
  OptimizedStorage.cleanup(['temp_', 'old_'], 7 * 24 * 60 * 60 * 1000); // 7 days
};