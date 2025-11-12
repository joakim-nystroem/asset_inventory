import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  let assets: Record<string, any>[] = [];
  let dbError: string | null = null;
  
  try {
    const response = await fetch(`/api/assets`);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to fetch initial assets');
    }

    const result = await response.json();
    assets = result.assets;

  } catch (err: unknown) {
    if (err instanceof Error) {
      dbError = err.message;
    } else {
      dbError = 'An unknown database error occurred while fetching initial assets.';
    }
    console.error('Database query failed:', dbError);
    assets = []
    
  }
  return {
      assets,
      dbError
    };
};