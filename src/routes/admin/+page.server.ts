import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
  try {
    const locations = await db
      .selectFrom('locations')
      .selectAll()
      .orderBy('name', 'asc')
      .execute();

    return { locations };
  } catch (err) {
    console.error('Failed to load locations:', err);
    return { locations: [] };
  }
};

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const name = data.get('name') as string;

    if (!name || name.trim().length === 0) {
      return fail(400, { error: 'Name is required' });
    }

    try {
      await db
        .insertInto('locations')
        .values({ name: name.trim() })
        .execute();

      return { success: true };
    } catch (err: any) {
      // Handle duplicate entries (MySQL error 1062)
      if (err.code === 'ER_DUP_ENTRY') {
         return fail(409, { error: 'Location already exists' });
      }
      console.error('Failed to create location:', err);
      return fail(500, { error: 'Database error' });
    }
  },

  delete: async ({ request }) => {
    const data = await request.formData();
    const id = Number(data.get('id'));

    if (!id) {
      return fail(400, { error: 'Invalid ID' });
    }

    try {
      await db
        .deleteFrom('locations')
        .where('id', '=', id)
        .execute();
        
      return { success: true };
    } catch (err) {
      console.error('Failed to delete location:', err);
      return fail(500, { error: 'Failed to delete' });
    }
  }
};