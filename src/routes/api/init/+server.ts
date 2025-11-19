import { json, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async () => {
  try {
    const assets = await db
      .selectFrom('asset_inventory')
      .selectAll()
      .execute();

    // 2. Return
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