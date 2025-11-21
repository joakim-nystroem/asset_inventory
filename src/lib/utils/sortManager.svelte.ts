// src/lib/utils/sortManager.svelte.ts
import { sortData, type SortDirection } from './sort';

export class SortManager {
  // State
  key = $state('');
  direction = $state<SortDirection>('asc');
  
  // Cache sorted results to avoid re-sorting
  private cache = new Map<string, any[]>();
  private originalOrder: any[] = [];

  /**
   * Generate cache key for current sort state
   */
  private getCacheKey(): string {
    return `${this.key}-${this.direction}`;
  }

  /**
   * Update sort state
   */
  update(columnKey: string, dir: SortDirection) {
    if (this.key === columnKey && this.direction === dir) {
      this.key = 'id';
      this.direction = 'asc';
    } else {
      this.key = columnKey;
      this.direction = dir;
    }
  }

  /**
   * Clear sort state (e.g. on new search)
   */
  reset() {
    this.key = '';
    this.direction = 'asc';
    this.cache.clear();
    this.originalOrder = [];
  }

  /**
   * Apply sort asynchronously with caching
   */
  async applyAsync(data: any[]): Promise<any[]> {
    // Store original order for cache invalidation
    if (this.originalOrder.length === 0 || this.originalOrder !== data) {
      this.originalOrder = data;
      this.cache.clear();
    }

    // If no key is set, return data as-is
    if (!this.key) return data;

    const cacheKey = this.getCacheKey();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Perform sort asynchronously to avoid blocking UI
    const sorted = await new Promise<any[]>((resolve) => {
      // Use setTimeout to yield to the browser
      setTimeout(() => {
        const result = sortData(data, this.key as any, this.direction);
        resolve(result);
      }, 0);
    });

    // Cache the result
    this.cache.set(cacheKey, sorted);
    
    return sorted;
  }

  /**
   * Synchronous apply (for compatibility)
   */
  apply(data: any[]): any[] {
    if (!this.key) return data;
    
    const cacheKey = this.getCacheKey();
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Sort and cache
    const sorted = sortData(data, this.key as any, this.direction);
    this.cache.set(cacheKey, sorted);
    
    return sorted;
  }

  /**
   * Clear cache when data changes
   */
  invalidateCache() {
    this.cache.clear();
    this.originalOrder = [];
  }
}