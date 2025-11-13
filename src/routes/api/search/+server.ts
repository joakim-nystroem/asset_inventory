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

	try {
		let sql = '';
		let params: string[] = [];

		if (searchTerm) {
			const matchCols = searchableColumns.join(', ');

			// We must use MATCH ... AGAINST to use the FULLTEXT index.
			// 'IN BOOLEAN MODE' allows us to use wildcards (*).
			sql = `
        SELECT * FROM asset_inventory
        WHERE MATCH(${matchCols}) AGAINST(? IN BOOLEAN MODE)
      `;

			// We add '*' wildcards to mimic the "LIKE %...%" behavior
			params = [`*${searchTerm}*`];
		} else {
			// No search term, just return all assets
			sql = 'SELECT * FROM asset_inventory';
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