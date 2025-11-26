import { db } from '$lib/server/db/db';
import { sql, type SqlBool } from 'kysely';
import type { AssetInventoryTable } from '$lib/server/db/db_types';

type AssetColumn = keyof AssetInventoryTable;

const searchableColumns = [
  'bu_estate', 'department', 'location', 'node',
  'asset_type', 'manufacturer', 'model', 'wbd_tag', 'serial_license'
];

/**
 * Shared search logic used by both the initial page load and the API endpoint.
 * Now agnostic of URLSearchParams.
 */
export async function searchAssets(searchTerm: string, filters: string[]) {
  try {
    let query = db.selectFrom('asset_inventory').selectAll();

    // 1. Handle Full Text Search
    if (searchTerm) {
      query = query.where(
         sql<SqlBool>`MATCH(${sql.raw(searchableColumns.join(', '))}) AGAINST (${`*${searchTerm}*`} IN BOOLEAN MODE)`
       );
    }

    // 2. Handle Dynamic Filters
    const groupedFilters: Record<string, string[]> = {};
    
    for (const filter of filters) {
      const [column, value] = filter.split(':');
      if (column && value) { 
        if (!groupedFilters[column]) groupedFilters[column] = [];
        groupedFilters[column].push(value);
      }
    }

    // Apply filters
    for (const [column, values] of Object.entries(groupedFilters)) {
        query = query.where(column as AssetColumn, 'in', values);
    }

    // 3. Execute
    return await query.orderBy('id').execute();

  } catch (err) {
    console.error('Database query failed:', err);
    return [];
  }
}