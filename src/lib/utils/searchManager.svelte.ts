// $lib/utils/searchManager.svelte.ts

import { SvelteMap } from "svelte/reactivity";
import { getUniqueValues, toggleFilter, removeFilter } from './filter';

export type Filter = {
  key: string;
  value: string;
};

export class SearchManager {
  // Search state
  term = $state('');
  inputValue = $state('');
  
  // Filter state
  selectedFilters = $state<Filter[]>([]);
  filterOptions: SvelteMap<string, any> = new SvelteMap();
  
  // Error state
  error = $state('');

  /**
   * Perform search with current term and filters
   */
  async search(baseData: any[]): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      if (this.term) params.set('q', this.term);
      
      if (this.selectedFilters.length > 0) {
        this.selectedFilters.forEach(f => {
          params.append('filter', `${f.key}:${f.value}`);
        });
      }
      
      // If no search term and no filters, return original data
      if (!this.term && this.selectedFilters.length === 0) {
        this.error = '';
        return [...baseData];
      }

      const response = await fetch(`./api/search?${params.toString()}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to fetch assets');
      }
      
      const result = await response.json();
      this.error = '';
      return result.assets;

    } catch (err) {
      this.error = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Database query failed:', this.error);
      return [];
    }
  }

  /**
   * Execute search using input value
   */
  executeSearch() {
    this.term = this.inputValue;
  }

  /**
   * Clear search term
   */
  clearSearch() {
    this.term = '';
    this.inputValue = '';
  }

  /**
   * Get unique filter values for a specific key
   */
  getFilterItems(key: string, assets: any[]): any[] {
    if (this.filterOptions.size > 0 && this.filterOptions.has(key)) {
      return this.filterOptions.get(key);
    }
    return getUniqueValues(assets, key);
  }

  /**
   * Toggle a filter value for a specific key
   */
  selectFilterItem(item: string, key: string, assets: any[]) {
    this.selectedFilters = toggleFilter(this.selectedFilters, key, item);
    
    // Cache filter options for this key
    if (!this.filterOptions.has(key)) {
      this.filterOptions.set(key, this.getFilterItems(key, assets));
    }
  }

  /**
   * Remove a specific filter
   */
  removeFilter(filter: Filter) {
    this.selectedFilters = removeFilter(this.selectedFilters, filter);
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    this.selectedFilters = [];
  }

  /**
   * Clean up filter cache based on active filters
   */
  cleanupFilterCache() {
    const activeFilterKeys = new Set(this.selectedFilters.map(f => f.key));
    for (const key of this.filterOptions.keys()) {
      if (!activeFilterKeys.has(key)) {
        this.filterOptions.delete(key);
      }
    }
  }

  /**
   * Check if a filter is currently selected
   */
  isFilterSelected(key: string, value: string): boolean {
    return this.selectedFilters.some(f => f.key === key && f.value === value);
  }

  /**
   * Get count of active filters
   */
  getFilterCount(): number {
    return this.selectedFilters.length;
  }
}