import { json, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';

export const GET: RequestHandler = async () => {
	try {
		// This endpoint's single responsibility is to get the first 100 items
		const sql = 'SELECT * FROM asset_inventory;';
		
		const [rows] = (await db.query(sql)) as RowDataPacket[][];
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