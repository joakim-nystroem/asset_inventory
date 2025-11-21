// src/lib/utils/filter.ts

export type Filter = {
  key: string;
  value: string;
};

// 1. Get Unique Values (Existing)
export function getUniqueValues<T>(data: T[], key: keyof T): string[] {
  const values = data
    .map((item) => item[key])
    .filter((val) => val != null && val !== ''); 

  return [...new Set(values)].sort().map(String);
}

// 2. Toggle Filter Logic (New)
// Takes the current list and the new item -> Returns the new list
export function toggleFilter(currentFilters: Filter[], key: string, value: string): Filter[] {
  const exists = currentFilters.some(f => f.key === key && f.value === value);

  if (exists) {
    // Return list WITHOUT the item
    return currentFilters.filter(f => !(f.key === key && f.value === value));
  } else {
    // Return list WITH the item
    return [...currentFilters, { key, value }];
  }
}

// 3. Remove Filter Logic (New)
export function removeFilter(currentFilters: Filter[], filterToRemove: Filter): Filter[] {
  return currentFilters.filter(item => item !== filterToRemove);
}