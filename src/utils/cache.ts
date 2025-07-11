/**
 * Caching utilities for Expo Finance Kit
 * Provides efficient data caching to reduce API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Simple in-memory cache implementation
 */
export class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Gets an item from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Sets an item in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds
   */
  set(key: string, data: T, ttl?: number): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp,
      expiresAt,
    });
  }

  /**
   * Checks if a key exists and is not expired
   * @param key - Cache key
   * @returns Boolean indicating if key exists
   */
  has(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }

  /**
   * Removes an item from cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears all cached items
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets all non-expired cache keys
   * @returns Array of valid cache keys
   */
  keys(): string[] {
    const validKeys: string[] = [];
    const now = Date.now();

    this.cache.forEach((entry, key) => {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      }
    });

    return validKeys;
  }

  /**
   * Gets cache size
   * @returns Number of items in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Removes expired entries
   */
  prune(): void {
    const now = Date.now();
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    });
  }
}

// Global cache instances
export const accountCache = new MemoryCache<any>(10 * 60 * 1000); // 10 minutes
export const transactionCache = new MemoryCache<any>(5 * 60 * 1000); // 5 minutes
export const balanceCache = new MemoryCache<any>(2 * 60 * 1000); // 2 minutes

/**
 * Creates a cache key for account queries
 * @param options - Query options
 * @returns Cache key
 */
export function createAccountCacheKey(options?: any): string {
  return `accounts:${JSON.stringify(options || {})}`;
}

/**
 * Creates a cache key for transaction queries
 * @param options - Query options
 * @returns Cache key
 */
export function createTransactionCacheKey(options?: any): string {
  const key = {
    accountId: options?.accountId,
    startDate: options?.startDate,
    endDate: options?.endDate,
    limit: options?.limit,
    offset: options?.offset,
  };
  return `transactions:${JSON.stringify(key)}`;
}

/**
 * Creates a cache key for balance queries
 * @param accountId - Account ID
 * @returns Cache key
 */
export function createBalanceCacheKey(accountId?: string): string {
  return `balance:${accountId || 'all'}`;
}

/**
 * Decorator for caching async functions
 * @param cache - Cache instance to use
 * @param keyGenerator - Function to generate cache key
 * @param ttl - Optional TTL override
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  cache: MemoryCache<any>,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const key = keyGenerator(...args);
      
      // Check cache first
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      cache.set(key, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Clears all caches
 */
export function clearAllCaches(): void {
  accountCache.clear();
  transactionCache.clear();
  balanceCache.clear();
}