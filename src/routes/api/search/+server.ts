import { json, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';

// The columns *covered by our FULLTEXT index*.
const searchableColumns = [
	'bu_estate',
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
	const filterParams = url.searchParams.getAll('filter');

	try {
		let conditions = ''
		let params: string[] = [];

		// Fulltext search
		if (searchTerm) {
			const matchCols = searchableColumns.join(', ');
			conditions += ` AND MATCH(${matchCols}) AGAINST(? IN BOOLEAN MODE)`;
			params.push(`*${searchTerm}*`);
		}

		const groupedFilters: Record<string, string[]> = {};

		// Filters
		for (const filter of filterParams) {
			const [column, value] = filter.split(':');
			if (column && value) {
				if (!groupedFilters[column]) {
					groupedFilters[column] = [];
				}
				groupedFilters[column].push(value);
			}
		}

		for (const [column, values] of Object.entries(groupedFilters)) {
			// Use backticks to escape the column name
			const escapedColumn = `\`${column}\``;

			const placeholders = values.map(() => '?').join(', ');
			
			conditions += ` AND ${escapedColumn} IN (${placeholders})`;
			params.push(...values); // Spread all values as parameters
		}

		let sql = 'SELECT * FROM `asset_inventory`';

		if (conditions) {
				sql += ` WHERE ${conditions.substring(5)}`; 
		}

		sql += ' ORDER BY `id`';

		const [rows] = (await db.query(sql, params)) as RowDataPacket[][];
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