// src/lib/utils/history.svelte.ts

export type HistoryAction = {
  id: number | string; // Track by ID, not row index (safer for sorting)
  key: string;         // The column key
  oldValue: string;
  newValue: string;
};

export class HistoryManager {
  // We use $state so we could eventually show "Undo" buttons in the UI
  undoStack = $state<HistoryAction[]>([]);
  redoStack = $state<HistoryAction[]>([]);

  // Add a new change to history
  record(id: number | string, key: string, oldValue: string, newValue: string) {
    // If values are same, don't record (optimization)
    if (oldValue === newValue) return;

    this.undoStack.push({ id, key, oldValue, newValue });
    
    // New action clears the redo history (standard behavior)
    this.redoStack = []; 
  }

  // Perform Undo
  undo(assets: any[]) {
    const action = this.undoStack.pop();
    if (!action) return;

    // Find the item in the current list by ID
    const item = assets.find(a => a.id === action.id);
    if (item) {
      item[action.key] = action.oldValue; // Revert
      this.redoStack.push(action);        // Move to redo
    }
  }

  // Perform Redo
  redo(assets: any[]) {
    const action = this.redoStack.pop();
    if (!action) return;

    const item = assets.find(a => a.id === action.id);
    if (item) {
      item[action.key] = action.newValue; // Re-apply
      this.undoStack.push(action);        // Move back to undo
    }
  }
}