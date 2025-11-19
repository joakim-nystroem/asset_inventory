export type SortDirection = 'asc' | 'desc';

export function sortData<T>(list: T[], key: keyof T, dir: SortDirection): T[] {
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