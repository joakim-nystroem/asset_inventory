<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";

  type Filter = {
    key: string;    // the column name
    value: string;  // the selected item
  };

  let { data } = $props();

  // --- State ---
  let assets = $state(data.assets);
  let dbError = $state('');
  let inputValue = $state('');
  let searchTerm: string = $state('');
  let sortKey = $state('');
  let sortDir = $state<'asc' | 'desc'>('asc');
  let openSortMenu = $state('');
  let openFilterMenu = $state('');

  let filterOptions: SvelteMap<string, any> = new SvelteMap();
  let selectedFilters: Filter[] = $state([]);

  let keys: string[] = $derived(assets.length > 0 ? Object.keys(assets[0]) : []);

  // --- Search Logic ---

  async function handleSearch() {
    if (!searchTerm && selectedFilters.length === 0) {
      assets = data.assets;
      return;
    }

    try {

      const params = new URLSearchParams();

      if (searchTerm) {
        params.set('q', searchTerm);
      }

      if (selectedFilters.length > 0) {
        selectedFilters.forEach(f => params.append('filter', `${f.key}:${f.value}`));
      }

      const response = await fetch(`./api/search?${params.toString()}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to fetch assets');
      }
      const result = await response.json();
      assets = result.assets;
    } catch (err) {
      if (err instanceof Error) {
        dbError = err.message;
      } else {
        dbError = 'An unknown database error occurred while fetching assets.';
      }
      console.error('Database query failed:', dbError);
      assets = [];
    }

    resetSort();
  }

 // --- Sorting Logic ---

  function getComparator(key: string, dir: 'asc' | 'desc') {
    const direction = dir === 'asc' ? 1 : -1;
    const sample = assets.find((a) => a[key] != null)?.[key];
    const type = typeof sample;
    return (a: any, b: any) => {
      const valA = a[key];
      const valB = b[key];
      if (valA == null) return 1;
      if (valB == null) return -1;
      let compare = 0;
      if (type === 'number') {
        compare = valA - valB;
      } else if (type === 'string') {
        compare = ('' + valA).localeCompare('' + valB);
      } else {
        compare = valA > valB ? 1 : valA < valB ? -1 : 0;
      }
      return compare * direction;
    };
  }

  function resetSort() {
    sortKey = '';
    sortDir = 'asc';
  }

  function applySort(key: string, dir: 'asc' | 'desc') {
    sortKey = key;
    sortDir = dir;
    assets = [...assets].sort(getComparator(key, dir));
    openSortMenu = ''; 
  }

  function handleSortClick(key: string, dir: 'asc' | 'desc') {
    if (sortKey === key && sortDir === dir) {
      applyDefaultSort();
      return;
    }
    applySort(key, dir);
  }

  function applyDefaultSort() {
    sortKey = 'id';
    sortDir = 'asc';
    assets = [...assets].sort(getComparator('id', 'asc'));
    openSortMenu = ''; 
  }

  // --- Filter Logic --- 

	function getFilterItems(key: string) {

    if(filterOptions.size > 0) {
      if (filterOptions.has(key)) {
        return filterOptions.get(key);
      }
    }

    // Creates a map of unique items for the column, and returns
    const items = [...new Set (assets
      .map((asset) => asset[key])
      .filter(item => item != null && item != '')
    )];

    return items;
  }

  function selectFilterItem(item: string, key: string) {

    // Check if it already exists
    const exists = selectedFilters.some(f => f.key === key && f.value === item);

    if (exists) {
      selectedFilters = selectedFilters.filter(f => !(f.key === key && f.value === item));
    } else {
      selectedFilters = [...selectedFilters, { key, value: item }];
    }

    if (!filterOptions.has(key)) {
      const menuItems = getFilterItems(key);
      filterOptions.set(key, menuItems);
    }
    
    closeMenu(); 
  }

  function removeFilterItem(filter: any) {
    selectedFilters = selectedFilters.filter(item => item != filter)
  }
  
  // --- Handler: Menu Management ---

  function handleClickOutside(event: MouseEvent) {
    if (openSortMenu === '') return;
    const target = event.target as HTMLElement;

    if (target.closest('th')) {
      return;
    }
    closeMenu();
  }

  function toggleFilterMenu(key: string) {
    if (openFilterMenu === key) {
      openFilterMenu = '';
    } else {
      openFilterMenu = key;
    }
  }

  function closeMenu() {
    openFilterMenu = ''
    openSortMenu = ''; 
  }

  // --- Lifecycle ---

  $effect(() => {
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  });

  $effect(() => {
    handleSearch();
  })

  $effect(() => {
    assets; 

    const activeFilterKeys = new Set(selectedFilters.map(f => f.key));

    for (const key of filterOptions.keys()) {
        if (!activeFilterKeys.has(key)) {
            filterOptions.delete(key);
        }
    }
});

</script>

<div class="flex flex-row gap-4 items-center mb-2">
  <h2 class="text-lg font-bold">Asset Master</h2>
  <div class="flex gap-4 items-center">
    <input
      bind:value={inputValue}
      class="bg-white dark:bg-neutral-100 dark:text-neutral-700 p-1 border border-neutral-300 dark:border-none focus:outline-none"
      placeholder="Search this list..."
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          searchTerm = inputValue
        }
      }}
    />
    <button
      onclick={() => {
        searchTerm = inputValue
      }}
      class="cursor-pointer bg-blue-500 hover:bg-blue-600 px-2 py-1 text-neutral-100">Search</button
    >
  </div>
  <div class="flex flex-row text-xs gap-2">
    {#each selectedFilters as filter} 
      <div class="p-1 border rounded-md border-neutral-700 dark:border-neutral-300 space-x-2 flex items-center">
        <span class="cursor-default">{(filter.key).charAt(0).toUpperCase() + (filter.key).slice(1)}: {filter.value}</span>
        <button 
          class="text-neutral-500 dark:text-neutral-300 text-base hover:dark:text-red-400 hover:text-red-600 hover:cursor-pointer"
          onclick={() => removeFilterItem(filter)}
          >✕</button>
      </div>
    {/each}
  </div>
</div>

{#if assets.length > 0}
  <div
    class="rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-auto no-scrollbar h-[calc(100dvh-9.3rem)] shadow-md"
  >
    <table
      class="min-w-full divide-y-2 divide-neutral-200 dark:divide-slate-700 text-xs table-fixed"
    >
      <thead>
        <tr>
          {#each keys as key}
            <th
              scope="col"
              class="group sticky top-0 z-10 whitespace-nowrap px-4 py-2 font-medium text-neutral-900 dark:text-neutral-100 text-left uppercase bg-neutral-50 dark:bg-slate-700 w-32 cursor-pointer select-none hover:bg-neutral-100 dark:hover:bg-slate-800"
              onclick={() => (openSortMenu = openSortMenu === key ? '' : key)}
            >
              <div class="flex items-center justify-between">
                <span>{key.replaceAll("_", " ")}</span>
                <span class="ml-1">
                  {#if sortKey === key}
                    <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  {:else}
                    <span class="invisible group-hover:visible text-neutral-400">▾</span>
                  {/if}
                </span>
              </div>

              {#if openSortMenu === key}
                <div
                  class="absolute z-20 top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded shadow-lg p-1 text-sm text-neutral-900 dark:text-neutral-100"
                >
                  <button
                    class="block w-full text-left px-2 py-1 hover:bg-neutral-100 dark:hover:bg-slate-800 items-center cursor-pointer"
                    onclick={(event) => {
                      event.stopPropagation();
                      handleSortClick(key, 'asc'); // Changed
                    }}
                  >
                    <div class="flex flex-row items-center">
                      <div class="min-w-3 text-xs">
                        {#if sortKey === key && sortDir === 'asc'}✓{/if}
                      </div>
                      <div>Sort A to Z</div>
                    </div>
                  </button>
                  <button
                    class="block w-full text-left px-2 py-1 hover:bg-neutral-100 dark:hover:bg-slate-800 items-center cursor-pointer"
                    onclick={(event) => {
                      event.stopPropagation();
                      handleSortClick(key, 'desc'); // Changed
                    }}
                  >
                    <div class="flex flex-row items-center border-b border-neutral-300 dark:border-neutral-600 pb-1">
                      <div class="min-w-3 text-xs">
                        {#if sortKey === key && sortDir === 'desc'}✓{/if}
                      </div>
                      <div>Sort Z to A</div>
                    </div>
                  </button>

									<button
                    class="block w-full text-left px-2 py-1 hover:bg-neutral-100 dark:hover:bg-slate-800 items-center cursor-pointer"
                    onclick={(event) => {
                      event.stopPropagation();
											toggleFilterMenu(key);
                    }}
                  >
                    <div class="flex flex-row items-center border-b border-neutral-300 dark:border-neutral-600 pb-1">
                      <div class="min-w-3 text-xs"><!-- Empty to maintain the space --></div>
                      <div>{@html 'Filter By >'}</div>
                    </div>
                  </button>
									{#if openFilterMenu === key}
										<div 
                      class="absolute z-20 top-0 left-full ml-1 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded shadow-lg p-1 text-sm min-w-48">
											<div class="max-h-48 overflow-y-auto no-scrollbar overscroll-contain">
												{#each getFilterItems(key) as item}
													<button
														class="block w-full text-left px-2 py-1 hover:bg-neutral-100 dark:hover:bg-slate-800 items-center cursor-pointer"
														onclick={(e) => {
                              selectFilterItem(item, key);
															e.stopPropagation();
														}}
													>
                            <div class="flex flex-row items-center">
                              <div class="min-w-3 text-xs">{#if selectedFilters.some(f => f.key === key && f.value === item)}✓{/if}</div>
                              <div>{item}</div>
                            </div>
													</button>
												{:else}
													<div class="px-2 py-1 text-neutral-500">No items found.</div>
												{/each}
											</div>
										</div>
									{/if}
                </div>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-200 dark:divide-slate-700">
        {#each assets as asset (asset.id || JSON.stringify(asset))}
          <tr>
            {#each keys as key}
              <td
                class="whitespace-nowrap px-4 py-2 text-neutral-700 dark:text-neutral-200 w-32 overflow-hidden text-ellipsis"
              >
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