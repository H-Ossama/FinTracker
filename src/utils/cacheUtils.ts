/**
 * Simple in-memory cache utility to reduce redundant AsyncStorage calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private static instance: SimpleCache;

  static getInstance(): SimpleCache {
    if (!SimpleCache.instance) {
      SimpleCache.instance = new SimpleCache();
    }
    return SimpleCache.instance;
  }

  set<T>(key: string, data: T, ttlMs: number = 5000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Invalidate entries with specific prefix (useful for related data)
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = SimpleCache.getInstance();

// Cache keys
export const CACHE_KEYS = {
  BILLS: 'bills',
  BILL_CATEGORIES: 'bill_categories',
  BUDGETS: 'budgets',
  BUDGET_CATEGORIES: 'budget_categories',
  WALLETS: 'wallets',
  CATEGORIES: 'categories',
} as const;

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  SHORT: 2000,   // 2 seconds - for frequently accessed data
  MEDIUM: 5000,  // 5 seconds - for moderately accessed data
  LONG: 30000,   // 30 seconds - for rarely changing data
} as const;