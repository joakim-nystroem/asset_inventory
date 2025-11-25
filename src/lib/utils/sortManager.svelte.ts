// src/lib/utils/sortManager.svelte.ts

export type SortDirection = 'asc' | 'desc';

/**
 * Sort data by a key and direction
 */
function sortData<T>(list: T[], key: keyof T, dir: SortDirection): T[] {
  const direction = dir === 'asc' ? 1 : -1;

  return [...list].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    // Null handling: Push nulls to the end
    if (valA == null) return 1;
    if (valB == null) return -1;

    // Number sorting
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * direction;
    }

    // String/Default sorting
    return String(valA).localeCompare(String(valB)) * direction;
  });
}

export class SortManager {
  // State
  key = $state('');
  direction = $state<SortDirection>('asc');
  
  // Cache sorted results to avoid re-sorting
  private cache = new Map<string, any[]>();
  private lastDataRef: any[] = [];

  /**
   * Generate cache key for current sort state
   */
  private getCacheKey(): string {
    return `${this.key}-${this.direction}`;
  }

  /**
   * Update sort state and toggle if same column
   */
  update(columnKey: string, dir: SortDirection) {
    // If clicking the same column with same direction, clear sort
    if (this.key === columnKey && this.direction === dir) {
      this.reset();
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
    this.lastDataRef = [];
  }

  /**
   * Apply sort synchronously with caching
   */
  apply(data: any[]): any[] {
    // If data reference changed, invalidate cache
    if (this.lastDataRef !== data) {
      this.cache.clear();
      this.lastDataRef = data;
    }

    // If no key is set, return data as-is
    if (!this.key) return data;

    const cacheKey = this.getCacheKey();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Sort and cache
    const sorted = sortData(data, this.key as any, this.direction);
    this.cache.set(cacheKey, sorted);
    
    return sorted;
  }

  /**
   * Apply sort asynchronously to avoid blocking UI
   */
  async applyAsync(data: any[]): Promise<any[]> {
    // If data reference changed, invalidate cache
    if (this.lastDataRef !== data) {
      this.cache.clear();
      this.lastDataRef = data;
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
   * Clear cache manually
   */
  invalidateCache() {
    this.cache.clear();
    this.lastDataRef = [];
  }

  /**
   * Check if a column is currently sorted
   */
  isActive(columnKey: string): boolean {
    return this.key === columnKey;
  }

  /**
   * Get current sort state for a column
   */
  getState(columnKey: string): { active: boolean; direction: SortDirection } {
    return {
      active: this.key === columnKey,
      direction: this.direction
    };
  }
}