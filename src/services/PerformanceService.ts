/**
 * Performance optimization service for the garden game
 * Provides smart caching, batching, and performance monitoring
 */

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  cacheHits: number;
  cacheMisses: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export class PerformanceService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static metrics: PerformanceMetrics = {
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  private static batchQueue = new Map<string, any[]>();
  private static batchTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Smart cache with TTL and usage tracking
   */
  static setCache<T>(key: string, data: T, ttl: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    });
  }

  static getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    entry.hits++;
    this.metrics.cacheHits++;
    return entry.data;
  }

  /**
   * Batch operations to reduce frequent calls
   */
  static batchOperation<T>(
    batchKey: string, 
    operation: T, 
    delay: number = 100
  ): Promise<T[]> {
    return new Promise((resolve) => {
      // Add to batch queue
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }
      this.batchQueue.get(batchKey)!.push(operation);

      // Clear existing timeout
      if (this.batchTimeouts.has(batchKey)) {
        clearTimeout(this.batchTimeouts.get(batchKey)!);
      }

      // Set new timeout to process batch
      const timeout = setTimeout(() => {
        const batch = this.batchQueue.get(batchKey) || [];
        this.batchQueue.delete(batchKey);
        this.batchTimeouts.delete(batchKey);
        resolve(batch);
      }, delay);

      this.batchTimeouts.set(batchKey, timeout);
    });
  }

  /**
   * Deferred execution using requestIdleCallback
   */
  static deferExecution<T>(callback: () => T): Promise<T> {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(callback()));
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => resolve(callback()), 0);
      }
    });
  }

  /**
   * Performance monitoring
   */
  static startRenderMeasure(): () => void {
    const startTime = performance.now();
    this.metrics.renderCount++;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      this.metrics.lastRenderTime = renderTime;
      this.metrics.averageRenderTime = 
        (this.metrics.averageRenderTime + renderTime) / 2;
    };
  }

  /**
   * Cache cleanup for memory management
   */
  static cleanupCache(maxAge: number = 300000): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge || entry.hits === 0) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get performance statistics
   */
  static getMetrics(): PerformanceMetrics & { cacheSize: number; cacheHitRate: number } {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: totalCacheRequests > 0 ? this.metrics.cacheHits / totalCacheRequests : 0
    };
  }

  /**
   * Debounce function for frequent operations
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function for high-frequency events
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}