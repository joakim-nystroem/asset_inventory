<script lang="ts">

	let { data } = $props();

	let assets = $state(data.assets);
	let dbError = $state('');
	let searchTerm = $state('');
	let keys = $derived(assets.length > 0 ? Object.keys(assets[0]) : []);

	let sortKey = $state('');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let openSortMenu = $state('');

	async function searchDatabase() {
		if (!searchTerm) {
			assets = data.assets;
			sortKey = '';
			sortDir = 'asc';
			return;
		}

		try {
			const response = await fetch(`./api/search?q=${searchTerm}`);
			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Failed to fetch assets');
			}
			const result = await response.json();
			assets = result.assets;
			sortKey = '';
			sortDir = 'asc';
		} catch (err) {
			if (err instanceof Error) {
				dbError = err.message;
			} else {
				dbError = 'An unknown database error occurred while fetching assets.';
			}
			console.error('Database query failed:', dbError);
			assets = [];
		}
	}

	function applyDefaultSort() {
		sortKey = '';
		sortDir = 'asc';
		assets = [...assets].sort((a, b) => {
			const valA = a['id'];
			const valB = b['id'];
			if (valA == null) return 1;
			if (valB == null) return -1;
			return valA - valB;
		});
		openSortMenu = '';
	}

	function applySort(key: string, dir: 'asc' | 'desc') {
		if (sortKey === key && sortDir === dir) {
			applyDefaultSort();
			return;
		}

		sortKey = key;
		sortDir = dir;
		const direction = dir === 'asc' ? 1 : -1;
		const sample = assets[0]?.[key];

		assets = [...assets].sort((a, b) => {
			const valA = a[key];
			const valB = b[key];
			if (valA == null) return 1 * direction;
			if (valB == null) return -1 * direction;
			if (typeof sample === 'number') return (valA - valB) * direction;
			if (typeof sample === 'string') return valA.localeCompare(valB) * direction;
			if (valA > valB) return 1 * direction;
			if (valA < valB) return -1 * direction;
			return 0;
		});

		openSortMenu = '';
	}

	function handleClickOutside(event: MouseEvent) {
		if (openSortMenu === '') return;
		const target = event.target as HTMLElement;
		if (target.closest('th')) {
			return;
		}
		openSortMenu = '';
	}

	// 2. Replaced onMount/onDestroy with $effect
	$effect(() => {
		window.addEventListener('click', handleClickOutside);

		// The returned function is the cleanup (onDestroy)
		return () => {
			window.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="flex flex-row gap-4 items-center mb-2">
	<h2 class="text-lg font-bold">Asset Master</h2>
	<div class="flex gap-4 items-center">
		<input
			class="bg-white dark:bg-neutral-100 dark:text-neutral-700 p-1 border border-neutral-300 dark:border-none focus:outline-none"
			placeholder="Search this list..."
			bind:value={searchTerm}
			onkeydown={(e) => {
				if (e.key === 'Enter') searchDatabase();
			}}
		/>
		<button
			onclick={() => searchDatabase()}
			class="cursor-pointer bg-blue-500 hover:bg-blue-600 px-2 py-1 text-neutral-100">Search</button
		>
	</div>
</div>

{#if assets.length > 0}
	<div
		class="rounded-lg border border-neutral-200 dark:border-slate-700 overflow-auto no-scrollbar max-h-[calc(100dvh-9.3rem)] shadow-md"
	>
		<table
			class="min-w-full divide-y-2 divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800 text-xs table-fixed"
		>
			<thead class="bg-neutral-50 dark:bg-slate-700">
				<tr>
					{#each keys as key}
						<th
							scope="col"
							class="group sticky top-0 z-10 whitespace-nowrap px-4 py-2 font-medium text-neutral-900 dark:text-neutral-100 text-left uppercase bg-neutral-50 dark:bg-slate-700 w-32 cursor-pointer select-none hover:bg-neutral-100 dark:hover:bg-slate-800"
							onclick={() => (openSortMenu = openSortMenu === key ? '' : key)}
						>
							<div class="flex items-center justify-between">
								<span>{key}</span>
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
										class="block w-full text-left px-2 py-1 hover:bg-neutral-100 dark:hover:bg-slate-800 items-center"
										onclick={(event) => {
											event.stopPropagation();
											applySort(key, 'asc');
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
										class="block w-full text-left px-2 py-1 hover:bg-neutral-100 dark:hover:bg-slate-800 items-center"
										onclick={(event) => {
											event.stopPropagation();
											applySort(key, 'desc');
										}}
									>
									<div class="flex flex-row items-center">
										<div class="min-w-3 text-xs">
											{#if sortKey === key && sortDir === 'desc'}✓{/if}
										</div>
										<div>Sort Z to A</div>
									</div>
									</button>
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