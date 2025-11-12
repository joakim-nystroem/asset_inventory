<script lang="ts">
  let { data } = $props();

  let assets = $state(data.assets);
  let dbError = $state('')

  let searchTerm = $state('')

  async function searchDatabase(query: string) {

    if (!searchTerm) {
      assets = data.assets;
    } 

    try {
      let response;
      if (query) {
        response = await fetch(`/api/assets?q=${query}`);
      } else {
        response = await fetch(`/api/assets`);
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to fetch assets');
      }

      const result = await response.json();
      assets = result.assets;

    } catch (err: unknown) {
      if (err instanceof Error) {
        dbError = err.message;
      } else {
        dbError = 'An unknown error occurred.';
      }
      assets = []; // Clear assets on error
    } 
  }

  let keys = $derived(assets.length > 0 ? Object.keys(assets[0]) : []);
</script>

<div class="flex flex-row gap-4 items-center mb-2">
  <h2 class="text-lg font-bold">Asset Master</h2>
  <div class="flex gap-4 items-center ">
    <input 
    class="bg-white dark:bg-neutral-100 p-1 border border-neutral-300 dark:border-none focus:outline-none" 
    placeholder="Search this list..." 
    bind:value={searchTerm}
    onkeydown={(e) => {if(e.key==='Enter')searchDatabase(searchTerm)}}
    >
    <button onclick={() => searchDatabase(searchTerm)} class="cursor-pointer bg-blue-500 hover:bg-blue-600 px-2 py-1 text-neutral-100">Search</button>
  </div>
</div>
{#if assets.length > 0}
  <div class="rounded-lg border border-neutral-200 dark:border-slate-700 overflow-x-auto overflow-y-auto max-h-[calc(100dvh-9rem)] shadow-md">
    <table class="min-w-full divide-y-2 divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800 text-sm">
      <thead class="bg-neutral-50 dark:bg-slate-700">
        <tr>
          {#each keys as key}
            <th scope="col" class="sticky top-0 z-10 whitespace-nowrap px-4 py-2 font-medium text-neutral-900 dark:text-neutral-100 text-left uppercase bg-neutral-50 dark:bg-slate-700">
              {key}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-200 dark:divide-slate-700">
        {#each assets as asset (asset.id || JSON.stringify(asset))}
          <tr>
            {#each keys as key}
              <td class="whitespace-nowrap px-4 py-2 text-neutral-700 dark:text-neutral-200">
                {asset[key]}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
    
  </div>
  <p class="mt-2 ml-1 text-sm text-neutral-600 dark:text-neutral-300">
    Showing {assets.length} items.
  </p>
{:else if dbError}
  <p class="text-red-500">Error: {dbError}</p>
{:else}
  <p>Query successful, but no data was returned.</p>
{/if}