import { json, error as svelteError } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    const { id, ...updates } = body;

    if (!id) {
      throw svelteError(400, 'Asset ID is required for updates.');
    }

    // 3. Perform the Update
    const result = await db
      .updateTable('asset_inventory')
      .set(updates) // Kysely automatically maps { model: 'New Model' } to `SET model = 'New Model'`
      .where('id', '=', id)
      .executeTakeFirst();

    // 4. Check if anything actually changed (optional, but good practice)
    // result.numUpdatedRows might be 0 if the ID wasn't found
    if (Number(result.numUpdatedRows) === 0) {
       // It's possible the ID doesn't exist, OR the data was identical to what's in DB.
       // Usually we just return success, or specific 404 if strictly needed.
    }

    return json({ success: true });

  } catch (err) {
    console.error('Update failed:', err);
    throw svelteError(500, 'Failed to update asset.');
  }
};