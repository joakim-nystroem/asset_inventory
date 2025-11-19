import { json, error as svelteError } from '@sveltejs/kit';
import { sql, type SqlBool } from 'kysely';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import type { AssetInventoryTable } from '$lib/server/db_types';

type AssetColumn = keyof AssetInventoryTable;

const searchableColumns = [
  'bu_estate', 'department', 'location', 'node',
  'asset_type', 'manufacturer', 'model', 'wbd_tag', 'serial_license'
];

export const GET: RequestHandler = async ({ url }) => {
  const searchTerm = url.searchParams.get('q') || '';
  const filterParams = url.searchParams.getAll('filter');

  try {
    let query = db.selectFrom('asset_inventory').selectAll();

    // 2. Handle Full Text Search
    if (searchTerm) {
      query = query.where(
         sql<SqlBool>`MATCH(${sql.raw(searchableColumns.join(', '))}) AGAINST (${`*${searchTerm}*`} IN BOOLEAN MODE)`
       );
    }

    // 3. Handle Dynamic Filters
    const groupedFilters: Record<string, string[]> = {};
    
    for (const filter of filterParams) {
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

    // 4. Execute
    const assets = await query.orderBy('id').execute();

    return json({ assets });

  } catch (err) {
    console.error('Database query failed:', err);
    throw svelteError(500, 'Database error');
  }
};