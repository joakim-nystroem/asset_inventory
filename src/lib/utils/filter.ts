export function getUniqueValues<T>(data: T[], key: keyof T): string[] {
  const values = data
    .map((item) => item[key])
    .filter((val) => val != null && val !== ''); // Remove nulls/empty strings

  return [...new Set(values)].sort().map(String);
}