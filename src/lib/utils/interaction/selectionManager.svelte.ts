// src/lib/utils/interaction/selectionManager.svelte.ts

export type GridCell = {
  row: number;
  col: number;
};

export type SelectionRange = {
  start: GridCell;
  end: GridCell;
};

export type OverlayRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  visible: boolean;
};

export class SelectionManager {
  // State: Single Range Selection
  start = $state<GridCell>({ row: -1, col: -1 });
  end = $state<GridCell>({ row: -1, col: -1 });
  
  isSelecting = $state(false);

  // Visual overlay for the single selection
  selectionOverlay = $state<OverlayRect>({ 
    top: 0, left: 0, width: 0, height: 0, visible: false 
  });
  
  // Visual overlay for the copied area
  copyOverlay = $state<OverlayRect>({ 
    top: 0, left: 0, width: 0, height: 0, visible: false 
  });

  /**
   * Helper: Calculate overlay rectangle geometry
   */
  private calculateRect(start: GridCell, end: GridCell): OverlayRect {
    if (start.row === -1 || end.row === -1) {
      return { top: 0, left: 0, width: 0, height: 0, visible: false };
    }

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    // DOM Query to find positions
    const startEl = document.querySelector(
      `div[data-row="${minRow}"][data-col="${minCol}"]`
    ) as HTMLElement;
    
    const endEl = document.querySelector(
      `div[data-row="${maxRow}"][data-col="${maxCol}"]`
    ) as HTMLElement;

    if (!startEl || !endEl) {
      return { top: 0, left: 0, width: 0, height: 0, visible: false };
    }

    return {
      top: startEl.offsetTop,
      left: startEl.offsetLeft,
      width: (endEl.offsetLeft + endEl.offsetWidth) - startEl.offsetLeft,
      height: (endEl.offsetTop + endEl.offsetHeight) - startEl.offsetTop,
      visible: true
    };
  }

  updateOverlay() {
    this.selectionOverlay = this.calculateRect(this.start, this.end);
  }

  /**
   * Handle Mouse Down on a cell
   */
  handleMouseDown(row: number, col: number, e: MouseEvent) {
    // Left click only
    if (e.button !== 0) return;

    this.isSelecting = true;

    // Shift Key: Extend Selection
    // Check if we have a valid start anchor before extending
    if (e.shiftKey && this.start.row !== -1) {
      this.end = { row, col };
    } 
    // Normal Click (or Ctrl Click, since disjoint ranges are out of scope)
    else {
      this.start = { row, col };
      this.end = { row, col };
    }

    this.updateOverlay();
  }

  /**
   * Handle Mouse Enter (Drag)
   */
  extendSelection(row: number, col: number) {
    if (this.isSelecting) {
      this.end = { row, col };
      this.updateOverlay();
    }
  }

  endSelection() {
    this.isSelecting = false;
  }

  /**
   * Programmatic Move / Keyboard Navigation
   */
  moveTo(row: number, col: number) {
    this.start = { row, col };
    this.end = { row, col };
    this.updateOverlay();
  }

  /**
   * Select specific cell (Context menu or programmatic)
   */
  selectCell(row: number, col: number) {
    // If cell is already inside the current rectangular selection, don't reset
    if (this.isCellSelected(row, col)) return;

    this.start = { row, col };
    this.end = { row, col };
    this.updateOverlay();
  }

  /**
   * Snapshot current selection for the dashed "Copy" border
   */
  snapshotAsCopied() {
    const rect = this.calculateRect(this.start, this.end);
    if (rect.visible) {
      this.copyOverlay = rect;
    }
  }

  clearCopyOverlay() {
    this.copyOverlay = { top: 0, left: 0, width: 0, height: 0, visible: false };
  }

  reset() {
    this.start = { row: -1, col: -1 };
    this.end = { row: -1, col: -1 };
    this.selectionOverlay.visible = false;
  }

  resetAll() {
    this.reset();
    this.copyOverlay.visible = false;
  }

  /**
   * Get the bounding box of the selection
   */
  getBounds() {
    if (this.start.row === -1 || this.end.row === -1) return null;

    return {
      minRow: Math.min(this.start.row, this.end.row),
      maxRow: Math.max(this.start.row, this.end.row),
      minCol: Math.min(this.start.col, this.end.col),
      maxCol: Math.max(this.start.col, this.end.col),
    };
  }

  /**
   * API Compatibility for InteractionHandler
   * Returns the current single selection as a range object
   */
  getPrimaryRange(): SelectionRange | null {
    if (this.start.row === -1) return null;
    return { start: this.start, end: this.end };
  }

  hasSelection() {
    return this.start.row !== -1;
  }

  getAnchor(): GridCell | null {
    return this.start.row !== -1 ? this.start : null;
  }

  /**
   * Check if a cell is within the rectangular bounds
   */
  isCellSelected(row: number, col: number): boolean {
    if (this.start.row === -1) return false;

    const minR = Math.min(this.start.row, this.end.row);
    const maxR = Math.max(this.start.row, this.end.row);
    const minC = Math.min(this.start.col, this.end.col);
    const maxC = Math.max(this.start.col, this.end.col);
    
    return row >= minR && row <= maxR && col >= minC && col <= maxC;
  }

  selectionMatchesCopy(): boolean {
    if (!this.selectionOverlay.visible || !this.copyOverlay.visible) return false;

    return this.selectionOverlay.top === this.copyOverlay.top &&
           this.selectionOverlay.left === this.copyOverlay.left &&
           this.selectionOverlay.width === this.copyOverlay.width &&
           this.selectionOverlay.height === this.copyOverlay.height;
  }
}