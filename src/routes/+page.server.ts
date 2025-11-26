import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/db';

export const load: PageServerLoad = async () => {
  let assets: Record<string, any>[] = [];
  let locations: Record<string, any>[] = [];
  let dbError: string | null = null;
  
  try {
    // Run queries in parallel for performance
    const [assetsResult, locationsResult] = await Promise.all([
      db.selectFrom('asset_inventory').selectAll().orderBy('id').execute(),
      db.selectFrom('locations').selectAll().orderBy('name').execute()
    ]);

    assets = assetsResult;
    locations = locationsResult;

  } catch (err: unknown) {
    if (err instanceof Error) {
      dbError = err.message;
    } else {
      dbError = 'An unknown database error occurred while fetching initial data.';
    }
    console.error('Database query failed:', dbError);
    // Return empty arrays on error so the UI doesn't crash completely
    assets = [];
    locations = [];
  }

  return {
    assets,
    locations, // Pass the new data to the frontend
    dbError
  };
};