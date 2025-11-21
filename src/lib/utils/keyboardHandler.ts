// $lib/utils/keyboardHandler.ts

import type { SelectionManager } from './selectionManager.svelte';

export type GridCell = { row: number; col: number };

/**
 * Navigate grid with arrow keys
 */
function getKeyboardNavigation(
  e: KeyboardEvent,
  current: GridCell | null,
  rowCount: number,
  colCount: number
): GridCell | null {
  if (!current) return { row: 0, col: 0 };

  const { row, col } = current;

  switch (e.key) {
    case 'ArrowUp':
      return row > 0 ? { row: row - 1, col } : null;
    case 'ArrowDown':
      return row < rowCount - 1 ? { row: row + 1, col } : null;
    case 'ArrowLeft':
      return col > 0 ? { row, col: col - 1 } : null;
    case 'ArrowRight':
      return col < colCount - 1 ? { row, col: col + 1 } : null;
    default:
      return null;
  }
}

export type KeyboardHandlers = {
  onCopy: () => void | Promise<void>;
  onPaste: () => void | Promise<void>;
  onUndo: () => void;
  onRedo: () => void;
  onEscape: () => void;
};

export function createKeyboardHandler(
  selection: SelectionManager,
  handlers: KeyboardHandlers,
  getGridSize: () => { rows: number; cols: number }
) {
  return function handleKeyDown(e: KeyboardEvent) {
    // Escape - Clear everything
    if (e.key === 'Escape') {
      handlers.onEscape();
      return;
    }

    // Ctrl/Cmd shortcuts
    if (e.metaKey || e.ctrlKey) {
      const key = e.key.toLowerCase();
      
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handlers.onRedo();
        } else {
          handlers.onUndo();
        }
        return;
      }
      
      if (key === 'y') {
        e.preventDefault();
        handlers.onRedo();
        return;
      }
      
      if (key === 'c') {
        e.preventDefault();
        handlers.onCopy();
        return;
      }
      
      if (key === 'v') {
        e.preventDefault();
        handlers.onPaste();
        return;
      }
    }

    // Arrow key navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); // Prevent page scroll
      
      const { rows, cols } = getGridSize();
      
      if (e.shiftKey) {
        // Shift + Arrow: Extend selection (multi-select)
        const current = selection.end.row !== -1 ? selection.end : selection.start;
        const next = getKeyboardNavigation(e, current, rows, cols);
        
        if (next) {
          if (selection.start.row === -1) {
            // No selection yet, start one
            selection.startSelection(next.row, next.col);
          } else {
            // Extend existing selection by moving the end point
            selection.end = next;
            selection.updateOverlay();
          }
        }
      } else {
        // Arrow only: Move selection (collapse to single cell)
        const current = selection.getAnchor();
        const next = getKeyboardNavigation(e, current, rows, cols);
        
        if (next) {
          selection.moveTo(next.row, next.col);
        }
      }
    }
  };
}