<script lang="ts">
  // --- UTILS IMPORTS ---
  import { createInteractionHandler } from '$lib/utils/interaction/interactionHandler';
  // --- STATE CLASSES ---
  import { ContextMenuState } from '$lib/utils/ui/contextMenu.svelte';
  import { HistoryManager } from '$lib/utils/interaction/historyManager.svelte';
  import { HeaderMenuState } from '$lib/utils/ui/headerMenu.svelte'
  import { SelectionManager, type VisualSelection } from '$lib/utils/interaction/selectionManager.svelte';
  import { ClipboardManager } from '$lib/utils/interaction/clipboardManager.svelte';
  import { SearchManager } from '$lib/utils/data/searchManager.svelte';
  import { SortManager } from '$lib/utils/data/sortManager.svelte';
  import { VirtualScrollManager } from '$lib/utils/core/virtualScrollManager.svelte';
  import { ColumnWidthManager } from '$lib/utils/core/columnManager.svelte';
  import { EditingManager } from '$lib/utils/data/editingManager.svelte';

  // Initialize State Classes
  const contextMenu = new ContextMenuState();
  const history = new HistoryManager();
  const headerMenu = new HeaderMenuState();
  const selection = new SelectionManager();
  const clipboard = new ClipboardManager();
  const search = new SearchManager();
  const sort = new SortManager();
  const virtualScroll = new VirtualScrollManager();
  const columnManager = new ColumnWidthManager();
  const editing = new EditingManager();

  let { data } = $props();
  // --- Data State ---
  let assets: Record<string, any>[] = $state(data.assets);
  let locations: Record<string, any>[] = $state(data.locations || []);
  let keys: string[] = data.assets.length > 0 ? Object.keys(data.assets[0]) : [];
  
  let scrollContainer: HTMLDivElement | null = $state(null);
  // Get visible items for rendering
  const visibleData = $derived(virtualScroll.getVisibleItems(assets));
  
  // --- Computed Overlays ---
  const selectionOverlay = $derived(
    selection.computeVisualOverlay(
      selection.start,
      selection.end,
      virtualScroll.visibleRange,
      keys,
      columnManager
    )
  );

  const copyOverlay = $derived(
    selection.isCopyVisible ? selection.computeVisualOverlay(
      selection.copyStart,
      selection.copyEnd,
      virtualScroll.visibleRange,
      keys,
      columnManager
    ) : null
  );

  // Editor Overlay Logic
  const editorOverlay = $derived.by(() => {
    if (!editing.active || editing.row === -1) return null;

    const overlay = selection.computeVisualOverlay(
      { row: editing.row, col: editing.col },
      { row: editing.row, col: editing.col },
      virtualScroll.visibleRange,
      keys,
      columnManager
    );

    return overlay;
  });

  // --- Interaction Handler (Keyboard & Mouse) ---
  const mountInteraction = createInteractionHandler(
    {
      selection,
      columnManager,
      contextMenu,
      headerMenu
    },
    {
      onCopy: async () => {
        await handleCopy();
        selection.reset();
      },
      onPaste: handlePaste,
      onUndo: () => history.undo(assets),
      onRedo: () => history.redo(assets),
      onEdit: () => initEditor(),
      onEscape: () => {
        if (editing.active) {
            editing.close();
            scrollContainer?.focus();
            return;
        }
        selection.resetAll();
        clipboard.clear();
        if (contextMenu.visible) contextMenu.close();
        headerMenu.close();
      },
      onWindowClick: (e: MouseEvent) => {
        // [Added] Click outside to save editor
        if (editing.active) {
          const target = e.target as HTMLElement;
          // If the click is NOT on the textarea, save and close
          if (target.tagName !== 'TEXTAREA') {
            saveEditor();
          }
        }
      },
      onScrollIntoView: (row, col) => {
        virtualScroll.ensureVisible(row, col, scrollContainer, keys, columnManager);
      },
      getGridSize: () => ({ rows: assets.length, cols: keys.length })
    }
  );

  // --- Editor Logic ---
  
  function initEditor() {
    const target = getActionTarget();
    if (!target) return;

    if (editing.isOpen(target.row, target.col)) return;

    if (contextMenu.visible) contextMenu.close();
    
    const key = keys[target.col];
    const item = assets[target.row];
    editing.start(target.row, target.col, key, item[key]);
  }

  function saveEditor() {
    if (!editing.active) return;

    const { row, col, key, value } = editing.save();
    
    const asset = assets[row];
    const oldValue = String(asset[key] ?? '');
    
    if (oldValue !== value) {
        history.record(asset.id, key, oldValue, value);
        asset[key] = value;
    }
    
    scrollContainer?.focus();
  }

  // --- Auto-size Logic for Textarea ---
  function autoSize(el: HTMLTextAreaElement) {
    // 1. Reset dimensions to measure natural size
    el.style.width = 'auto';
    el.style.height = 'auto';
    el.style.whiteSpace = 'nowrap'; // Start with single line

    // 2. Base width is the column width
    const minWidth = columnManager.getWidth(editing.key);
    const MAX_WIDTH = 300;

    // 3. Measure content width
    // scrollWidth includes padding, so it's a good proxy for "content + buffer"
    let calculatedWidth = Math.max(minWidth, el.scrollWidth);

    if (calculatedWidth > MAX_WIDTH) {
        // CASE: Text is long. Clamp width, enable wrap, expand height.
        el.style.width = `${MAX_WIDTH}px`;
        el.style.whiteSpace = 'pre-wrap'; 
        el.style.height = `${el.scrollHeight}px`; // Expand height to fit wrapped text
    } else {
        // CASE: Text fits within 300px. Expand width only.
        el.style.width = `${calculatedWidth}px`;
        el.style.height = `${el.scrollHeight}px`; // Should be single line height
    }
  }

  // --- Search Logic ---
  async function handleSearch() {
    const result = await search.search(data.assets);
    assets = result;
    selection.reset();
    sort.invalidateCache();
    sort.reset();
  }

  // --- Sorting Logic ---
  async function applySort(key: string, dir: 'asc' | 'desc') {
    selection.reset();
    sort.update(key, dir);
    assets = await sort.applyAsync(assets);
    headerMenu.close();
  }

  // --- Clipboard Logic ---
  async function handleCopy() {
    await clipboard.copy(selection, assets, keys);
    if (contextMenu.visible) contextMenu.close();
  }

  // --- Context Menu ---
  function handleContextMenu(e: MouseEvent, visibleIndex: number, col: number) {
    const actualRow = virtualScroll.getActualIndex(visibleIndex);
    selection.selectCell(actualRow, col);
    contextMenu.open(e, actualRow, col);
  }

  function getActionTarget() {
    if (contextMenu.visible) {
      return { row: contextMenu.row, col: contextMenu.col };
    }
    return selection.getAnchor();
  }

  async function handlePaste() {
    const target = getActionTarget();
    if (!target) return;

    const pasteSize = await clipboard.paste(target, assets, keys, history);
    
    if (contextMenu.visible) contextMenu.close();
    if (pasteSize) {
      const startRow = target.row;
      const startCol = target.col;
      const endRow = Math.min(startRow + pasteSize.rows - 1, assets.length - 1);
      const endCol = Math.min(startCol + pasteSize.cols - 1, keys.length - 1);

      selection.reset();
      selection.start = { row: startRow, col: startCol };
      selection.end = { row: endRow, col: endCol };
    }
  }

  function handleEditAction() { 
    initEditor();
  }

  // --- Lifecycle & Window Events ---
  
  $effect(() => {
    // Mount the unified interaction handler
    const cleanupInteraction = mountInteraction(window);
    
    // Resize Observer for Virtual Scroll
    let resizeObserver: ResizeObserver | null = null;
    if (scrollContainer) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          virtualScroll.updateContainerHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(scrollContainer);
    }
    
    return () => {
        cleanupInteraction();
        if (resizeObserver) resizeObserver.disconnect();
    };
  });

  $effect(() => { 
    search.term;
    search.selectedFilters;
    handleSearch(); 
  })

  $effect(() => {
    assets; 
    search.cleanupFilterCache();
    sort.invalidateCache();
  });
</script>

<div class="flex flex-row gap-4 items-center mb-2">
  <h2 class="text-lg font-bold whitespace-nowrap">Asset Master</h2>
  <div class="flex gap-4 items-center">
    <input
      bind:value={search.inputValue}
      class="bg-white dark:bg-neutral-100 dark:text-neutral-700 placeholder-neutral-500! p-1 border border-neutral-300 dark:border-none focus:outline-none"
      placeholder="Search..."
      onkeydown={(e) => { if (e.key === 'Enter') search.executeSearch() }}
    />
    <button
      onclick={() => search.executeSearch()}
      class="cursor-pointer bg-blue-500 hover:bg-blue-600 px-2 py-1 text-neutral-100">Search</button
    >
  </div>
  
  <div class="flex flex-row w-full justify-between items-center">
    <div class="flex flex-row text-xs gap-2">
      {#each search.selectedFilters as filter} 
        <div class="p-1 outline-1 rounded-md outline-neutral-700 dark:outline-neutral-300 space-x-2 flex items-center">
          <span class="cursor-default">{((filter.key).charAt(0).toUpperCase() + (filter.key).slice(1)).replaceAll('_', ' ')}: {filter.value}</span>
          <button 
            class="text-neutral-500 dark:text-neutral-300 text-base hover:dark:text-red-400 hover:text-red-600 hover:cursor-pointer"
            onclick={() => search.removeFilter(filter)}>✕</button>
        </div>
      {/each}
    </div>
    <div class="flex gap-2 items-center">
      {#if search.getFilterCount() > 0}
        <button onclick={() => search.clearAllFilters()} class="cursor-pointer bg-red-600 hover:bg-red-700 px-2 py-1 text-neutral-100">Clear</button>
      {/if}
    </div>
  </div>
</div>

{#if assets.length > 0}
  <div 
    bind:this={scrollContainer}
    onscroll={(e) => virtualScroll.handleScroll(e)}
    class="rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-auto h-[calc(100dvh-8.8rem)] shadow-md relative select-none focus:outline-none"
    tabindex="-1"
  >
    <div class="w-max min-w-full bg-white dark:bg-slate-800 text-leftkz relative" style="height: {virtualScroll.getTotalHeight(assets.length) + 32}px;">
      
      <div class="sticky top-0 z-20 flex border-b border-neutral-200 dark:border-slate-600 bg-neutral-50 dark:bg-slate-700">
        {#each keys as key, i}
          <div 
            data-header-col={i}
            class="header-interactive relative group border-r border-neutral-200 dark:border-slate-600 last:border-r-0"
            style="width: {columnManager.getWidth(key)}px;
                   min-width: {columnManager.getWidth(key)}px;"
          >
            <button
              class="w-full h-full px-2 py-2 text-xs font-medium text-neutral-900 dark:text-neutral-100 uppercase hover:bg-neutral-100 dark:hover:bg-slate-600 text-left flex items-center justify-between focus:outline-none focus:bg-neutral-200 dark:focus:bg-slate-500 cursor-pointer"
              onclick={(e) => headerMenu.toggle(e, key)}
            >
              <span class="truncate">{key.replaceAll("_", " ")}</span>
              <span class="ml-1">
                {#if sort.key === key}
                  <span>{sort.direction === 'asc' ? '▲' : '▼'}</span>
                {:else}
                  <span class="invisible group-hover:visible text-neutral-400">▾</span>
                {/if}
              </span>
            </button>

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
                class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-50"
                onmousedown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.body.style.cursor = 'col-resize';
                    columnManager.startResize(key, e.clientX);
                }}
                onclick={(e) => e.stopPropagation()} 
                ondblclick={(e) => {
                    e.stopPropagation();
                    columnManager.resetWidth(key);
                }}
            ></div>
          </div>
        {/each}
      </div>

      <div class="absolute top-8 w-full" style="transform: translateY({virtualScroll.getOffsetY()}px);">
        
        {#if copyOverlay}
            <div
             class="absolute pointer-events-none z-20 border-blue-600 dark:border-blue-500"
             style="
                top: {copyOverlay.top}px;
                left: {copyOverlay.left}px; 
                width: {copyOverlay.width}px; 
                height: {copyOverlay.height}px;
                border-top-style: {copyOverlay.showTopBorder ? 'dashed' : 'none'};
                border-bottom-style: {copyOverlay.showBottomBorder ? 'dashed' : 'none'};
                border-left-style: {copyOverlay.showLeftBorder ? 'dashed' : 'none'};
                border-right-style: {copyOverlay.showRightBorder ? 'dashed' : 'none'};
                border-width: 2px;
            "
            ></div>
        {/if}

        {#if selectionOverlay}
            <div
            class="absolute pointer-events-none z-10 border-blue-600 dark:border-blue-500 bg-blue-900/10"
            style="
                top: {selectionOverlay.top}px;
                left: {selectionOverlay.left}px; 
                width: {selectionOverlay.width}px; 
                height: {selectionOverlay.height}px;
                border-top-style: {selectionOverlay.showTopBorder ? 'solid' : 'none'};
                border-bottom-style: {selectionOverlay.showBottomBorder ? 'solid' : 'none'};
                border-left-style: {selectionOverlay.showLeftBorder ? 'solid' : 'none'};
                border-right-style: {selectionOverlay.showRightBorder ? 'solid' : 'none'};
                border-width: 2px;
            "
            ></div>
        {/if}

        {#if editorOverlay && editing.active}
             <!-- svelte-ignore a11y_autofocus -->
             <textarea
                value={editing.value}
                oninput={(e) => {
                    editing.value = e.currentTarget.value;
                    autoSize(e.currentTarget);
                }}
                onkeydown={(e) => {
                    e.stopPropagation(); // Don't trigger grid nav
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEditor();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        editing.close();
                        scrollContainer?.focus();
                    }
                }}
                use:autoSize
                autofocus
                class="absolute z-50 bg-white dark:bg-slate-700 text-neutral-900 dark:text-neutral-100 text-xs border-2 border-blue-600 px-2 py-1.5 resize-none overflow-hidden shadow-xl leading-none"
                style="
                    top: {editorOverlay.top}px;
                    left: {editorOverlay.left}px;
                    min-width: {editorOverlay.width}px;
                    min-height: {editorOverlay.height}px;
                "
             ></textarea>
        {/if}

        {#each visibleData.items as asset, i (asset.id || (visibleData.startIndex + i))}
          {@const actualIndex = visibleData.startIndex + i}
          <div class="flex h-8 border-b border-neutral-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700">
            {#each keys as key, j} 
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                data-row={actualIndex}
                data-col={j} 
                onmousedown={(e) => {
                    if (editing.active) return;
                    selection.handleMouseDown(actualIndex, j, e)
                }}
                onmouseenter={() => {
                     if (editing.active) return;
                     selection.extendSelection(actualIndex, j)
                }}
                oncontextmenu={(e) => handleContextMenu(e, i, j)}
                class="
                  h-full px-2 flex items-center text-xs cursor-cell
                  text-neutral-700 dark:text-neutral-200 
                  hover:bg-blue-100 dark:hover:bg-slate-600
                  border-r border-neutral-200 dark:border-slate-700 last:border-r-0
                "
                style="width: {columnManager.getWidth(key)}px;
                       min-width: {columnManager.getWidth(key)}px;"
              >
                <span class="truncate w-full">
                  {asset[key]}
                </span>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>
  <p class="mt-2 ml-1 text-sm text-neutral-600 dark:text-neutral-300">Showing {assets.length} items.</p>
{:else if search.error}
  <p class="text-red-500">Error: {search.error}</p>
{:else}
  <p>Query successful, but no data was returned.</p>
{/if}

{#if headerMenu.activeKey}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed z-50 bg-neutral-50 dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded shadow-xl py-1 text-sm text-neutral-900 dark:text-neutral-100 min-w-48 font-normal normal-case cursor-default text-left flex flex-col"
    style="top: {headerMenu.y}px;
           left: {headerMenu.x}px;" 
    onclick={(e) => e.stopPropagation()}
  >
    <button 
      class="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-left flex items-center gap-2 group w-full" 
      onclick={() => applySort(headerMenu.activeKey, 'asc')}
    >
      <div class="w-4 flex justify-center text-blue-600 dark:text-blue-400 font-bold">
        {#if sort.key === headerMenu.activeKey && sort.direction === 'asc'}✓{/if}
      </div>
      <span>Sort A to Z</span>
    </button>
    
    <button 
      class="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-left flex items-center gap-2 group w-full" 
      onclick={() => applySort(headerMenu.activeKey, 'desc')}
    >
      <div class="w-4 flex justify-center text-blue-600 dark:text-blue-400 font-bold">
        {#if sort.key === headerMenu.activeKey && sort.direction === 'desc'}✓{/if}
      </div>
      <span>Sort Z to A</span>
    </button>
  
    <div class="border-b border-neutral-200 dark:border-slate-700 my-1"></div>
  
    <div class="relative w-full">
      <button 
        class="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-left flex items-center justify-between group w-full" 
        onclick={() => headerMenu.toggleFilter()}
      >
        <div class="flex items-center gap-2">
           <div class="w-4"></div>
           <span>Filter By</span>
        </div>
        <span class="text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">›</span>
      </button>

      {#if headerMenu.filterOpen}
        <div class="absolute z-50 top-0 left-full ml-0.5 bg-neutral-50 dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded shadow-xl py-1 text-sm min-w-48">
          
          <div class="px-2 py-1 border-b border-neutral-200 dark:border-slate-700 mb-1">
            <input 
              bind:value={headerMenu.filterSearchTerm}
              class="w-full pl-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400!
                     dark:placeholder:text-neutral-300! focus:outline-none text-xs"
              placeholder="Search values..."
              onclick={(e) => e.stopPropagation()}
              onkeydown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  headerMenu.close();
                }
              }}
            />
          </div>

          <div class="max-h-48 overflow-y-auto no-scrollbar">
             {#each search.getFilterItems(headerMenu.activeKey, assets)
               .filter(i => i.toLowerCase().includes(headerMenu.filterSearchTerm.toLowerCase())) 
                as item
             }
              <button 
                class="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-left flex items-center gap-2 group w-full" 
                onclick={() => { 
                   search.selectFilterItem(item, headerMenu.activeKey, assets);
                  // headerMenu.close(); 
                }}
              >
                <div class="w-4 flex justify-center text-blue-600 dark:text-blue-400 font-bold">
                   {#if search.isFilterSelected(headerMenu.activeKey, item)}✓{/if}
                </div>
                <div class="truncate">{item}</div>
              </button>
            {:else}
              <div class="px-3 py-1.5 text-neutral-500">No items found.</div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if contextMenu.visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed z-[60] bg-neutral-50 dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded shadow-xl py-1 text-sm text-neutral-900 dark:text-neutral-100 min-w-32 cursor-default text-left flex flex-col"
    style="top: {contextMenu.y}px;
           left: {contextMenu.x}px;"
    onclick={(e) => e.stopPropagation()}
  >
    <button class="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-left flex items-center gap-2 group" onclick={handleEditAction}>
      <svg class="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
      <span>Edit</span>
    </button>
    
    <div class="border-b border-neutral-200 dark:border-slate-700 my-1"></div>
    
    <button class="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-left flex items-center gap-2 group" onclick={handleCopy}>
      <svg class="w-4 h-4 text-neutral-500 dark:text-neutral-400 
        group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
      <span>Copy</span>
    </button>
    
    <button class="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-left flex items-center gap-2 group" onclick={handlePaste}>
      <svg class="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" 
        stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 
        0 00-2 2v12a2 2 0 002 2h10a2 2 
        0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
      <span>Paste</span>
    </button>
  </div>
{/if}