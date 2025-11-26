<script lang="ts">
  import { enhance } from '$app/forms';
  
  let { data, form } = $props();
  let locations = $derived(data.locations);
  let loading = $state(false);
</script>

<div class="p-8 max-w-2xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <h1 class="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Location Management</h1>
    <a href="/" class="text-blue-500 hover:underline">Back to Assets</a>
  </div>

  <!-- Create Form -->
  <div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-neutral-200 dark:border-slate-700 mb-8">
    <h2 class="text-lg font-semibold mb-4 text-neutral-700 dark:text-neutral-200">Add New Location</h2>
    
    <form 
      method="POST" 
      action="?/create" 
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          await update();
          loading = false;
        };
      }}
      class="flex gap-4"
    >
      <div class="flex-1">
        <input 
          type="text" 
          name="name" 
          placeholder="e.g. Tokyo..." 
          class="w-full px-4 py-2 rounded border border-neutral-300 dark:border-slate-600 bg-neutral-50 dark:bg-slate-900 text-neutral-900 dark:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          autocomplete="off"
        />
        {#if form?.error}
          <p class="text-red-500 text-sm mt-1">{form.error}</p>
        {/if}
      </div>
      <button 
        type="submit" 
        disabled={loading}
        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Adding...' : 'Add'}
      </button>
    </form>
  </div>

  <!-- List -->
  <div class="bg-white dark:bg-slate-800 rounded-lg shadow border border-neutral-200 dark:border-slate-700 overflow-hidden">
    <table class="w-full text-left">
      <thead class="bg-neutral-50 dark:bg-slate-700 border-b border-neutral-200 dark:border-slate-600">
        <tr>
          <th class="px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">ID</th>
          <th class="px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Name</th>
          <th class="px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-200 dark:divide-slate-700">
        {#each locations as loc}
          <tr class="hover:bg-neutral-50 dark:hover:bg-slate-700/50">
            <td class="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400 font-mono">{loc.id}</td>
            <td class="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{loc.name}</td>
            <td class="px-6 py-4 text-right">
              <form 
                method="POST" 
                action="?/delete" 
                use:enhance
                class="inline-block"
              >
                <input type="hidden" name="id" value={loc.id} />
                <button 
                  type="submit" 
                  class="text-red-500 hover:text-red-700 text-sm font-medium hover:underline cursor-pointer"
                  onclick={(e) => { if(!confirm('Are you sure?')) e.preventDefault(); }}
                >
                  Delete
                </button>
              </form>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="3" class="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
              No locations found. Add one above.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>