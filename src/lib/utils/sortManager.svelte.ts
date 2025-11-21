// src/lib/utils/sortManager.svelte.ts
import { sortData, type SortDirection } from './sort';

export class SortManager {
  // State
  key = $state('');
  direction = $state<SortDirection>('asc');

  update(columnKey: string, dir: SortDirection) {
    if (this.key === columnKey && this.direction === dir) {
      this.key = 'id';
      this.direction = 'asc';
    } else {
      this.key = columnKey;
      this.direction = dir;
    }
  }

  // Clear sort state (e.g. on new search)
  reset() {
    this.key = '';
    this.direction = 'asc';
  }

  // Apply the current sort state to a dataset
  apply(data: any[]) {
    // If no key is set, return data as-is (or you could force ID sort here)
    if (!this.key) return data;
    
    // @ts-ignore: key access is dynamic
    return sortData(data, this.key, this.direction);
  }
}