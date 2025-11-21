// $lib/utils/clipboardManager.svelte.ts

import type { SelectionManager } from './selectionManager.svelte';
import type { HistoryManager } from './history.svelte';

/**
 * Copy text to system clipboard
 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }
}

/**
 * Read text from system clipboard
 */
async function readFromClipboard(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch (err) {
    console.error('Failed to read from clipboard:', err);
    return null;
  }
}

export type CopiedItem = {
  relRow: number;
  relCol: number;
  value: string;
};

export class ClipboardManager {
  // Internal clipboard storage
  internal = $state<CopiedItem[]>([]);

  /**
   * Copy selected cells to clipboard (both internal and system)
   */
  async copy(
    selectionManager: SelectionManager,
    assets: any[],
    keys: string[]
  ) {
    // 1. Snapshot visual overlay
    selectionManager.snapshotAsCopied();

    // 2. Get selection bounds
    const bounds = selectionManager.getBounds();
    if (!bounds) return;

    // 3. Capture data for internal clipboard and external clipboard
    const newClipboard: CopiedItem[] = [];
    const externalRows: string[] = [];

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      const rowStrings: string[] = [];

      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const key = keys[c];
        const value = String(assets[r][key] ?? '');

        // A. Internal Memory (Relative Position)
        newClipboard.push({
          relRow: r - bounds.minRow,
          relCol: c - bounds.minCol,
          value: value
        });

        // B. External String (For Excel/Notepad)
        rowStrings.push(value);
      }

      // Join columns with Tab (\t)
      externalRows.push(rowStrings.join('\t'));
    }

    this.internal = newClipboard;
    
    // Don't reset selection - keep it visible for keyboard navigation
    // selectionManager.reset();

    const textBlock = externalRows.join('\n');

    // Copy to system clipboard (async)
    setTimeout(async () => {
      await copyToClipboard(textBlock);
    }, 0);
  }

  /**
   * Paste from system clipboard into target cell
   */
  async paste(
    target: { row: number; col: number } | null,
    assets: any[],
    keys: string[],
    historyManager: HistoryManager
  ) {
    if (!target) return;
    if (!assets[target.row]) return;

    const text = await readFromClipboard();

    if (text !== null) {
      const key = keys[target.col];
      const targetRow = assets[target.row];
      const oldValue = String(targetRow[key] ?? '');

      targetRow[key] = text;
      historyManager.record(targetRow.id, key, oldValue, text);
      console.log(`Pasted '${text}' into [${target.row}, ${key}]`);
    }
  }

  /**
   * Clear internal clipboard
   */
  clear() {
    this.internal = [];
  }

  /**
   * Check if clipboard has data
   */
  hasData() {
    return this.internal.length > 0;
  }
}