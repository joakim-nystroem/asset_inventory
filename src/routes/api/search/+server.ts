import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchAssets } from '$lib/server/queries/search';

export const GET: RequestHandler = async ({ url }) => {
  // Extract params from URL
  const searchTerm = url.searchParams.get('q') || '';
  const filters = url.searchParams.getAll('filter');

  const assets = await searchAssets(searchTerm, filters);
  
  return json({ assets });
};