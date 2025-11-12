import { json, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';

// Whitelist of columns to search, as specified.
const searchableColumns = [
  'department',
  'location',
  'node',
  'asset_type',
  'manufacturer',
  'model',
  'wbd_tag',
  'serial_license'
];


export const GET: RequestHandler = async ({ url }) => {
  const searchTerm = url.searchParams.get('q') || '';

  try {
    const whereConditions: string[] = [];
    const params: string[] = [];
    
    if (searchTerm) {
      // The search term is handled as one single string, as-is.
      const likeTerm = `%${searchTerm}%`;
      
      // Check this ONE term against all specified columns
      const searchClauses = searchableColumns.map(col => `\`${col}\` LIKE ?`).join(' OR ');
      whereConditions.push(`(${searchClauses})`);
      
      // Add the parameter once for each column being searched
      searchableColumns.forEach(() => params.push(likeTerm));
    }
    
    let sql = 'SELECT * FROM asset_inventory';
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    sql += ' ORDER BY `id`'; // Default sort/limit
    
    const [rows] = await db.query(sql, params) as RowDataPacket[][];
    const assets = JSON.parse(JSON.stringify(rows));
    
    return json({ assets });

  } catch (err: unknown) {
    let dbError: string;
    if (err instanceof Error) {
      dbError = err.message;
    } else {
      dbError = 'An unknown database error occurred.';
    }
    console.error('Database query failed:', dbError);
    throw svelteError(500, dbError);
  }
};