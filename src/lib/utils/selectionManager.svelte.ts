// $lib/utils/selection.svelte.ts

export type GridCell = {
  row: number;
  col: number;
};

export type OverlayRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  visible: boolean;
};

export class SelectionManager {
  // Selection state
  start = $state<GridCell>({ row: -1, col: -1 });
  end = $state<GridCell>({ row: -1, col: -1 });
  isSelecting = $state(false);

  // Visual overlays
  selectionOverlay = $state<OverlayRect>({ 
    top: 0, left: 0, width: 0, height: 0, visible: false 
  });
  
  copyOverlay = $state<OverlayRect>({ 
    top: 0, left: 0, width: 0, height: 0, visible: false 
  });

  /**
   * Calculate overlay rectangle geometry from start/end cells
   */
  private calculateOverlayRect(start: GridCell, end: GridCell): OverlayRect {
    if (start.row === -1 || end.row === -1) {
      return { top: 0, left: 0, width: 0, height: 0, visible: false };
    }

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

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

  /**
   * Update the selection overlay based on current start/end
   */
  updateOverlay() {
    this.selectionOverlay = this.calculateOverlayRect(this.start, this.end);
  }

  /**
   * Start a new selection (mouse down)
   */
  /**
   * Start a new selection (mouse down)
   */
  startSelection(row: number, col: number, expand: boolean = false) {
    // Default assumption: We are starting a selection drag
    this.isSelecting = true;

    if (expand && this.start.row !== -1) {
      this.end = { row, col };
      this.updateOverlay();
      return; 
    }

    if (this.start.row === row && this.start.col === col && 
        this.end.row === row && this.end.col === col) {
      this.reset();
      this.isSelecting = false; // Override default: don't drag-select on empty
      return;
    }

    // 3. Start New Selection (Default Fall-through)
    // If we haven't returned yet, it's a standard new selection.
    this.start = { row, col };
    this.end = { row, col };
    this.updateOverlay();
  }

  /**
   * Extend selection (mouse drag)
   */
  extendSelection(row: number, col: number) {
    if (this.isSelecting) {
      this.end = { row, col };
      this.updateOverlay();
    }
  }

  /**
   * End selection (mouse up)
   */
  endSelection() {
    this.isSelecting = false;
  }

  /**
   * Move selection anchor (keyboard navigation)
   */
  moveTo(row: number, col: number) {
    this.start = { row, col };
    this.end = { row, col };
    this.updateOverlay();
  }

  /**
   * Set a specific cell as selected (e.g., from context menu)
   */
  selectCell(row: number, col: number) {
    this.start = { row, col };
    this.end = { row, col };
    this.updateOverlay();
  }

  /**
   * Snapshot current selection as "copied" overlay
   */
  snapshotAsCopied() {
    const rect = this.calculateOverlayRect(this.start, this.end);
    if (rect.visible) {
      this.copyOverlay = rect;
    }
  }

  /**
   * Clear the copied overlay
   */
  clearCopyOverlay() {
    this.copyOverlay = { top: 0, left: 0, width: 0, height: 0, visible: false };
  }

  /**
   * Reset selection state (but preserve copy overlay)
   */
  reset() {
    this.start = { row: -1, col: -1 };
    this.end = { row: -1, col: -1 };
    this.selectionOverlay.visible = false;
  }

  /**
   * Reset everything including copy overlay
   */
  resetAll() {
    this.reset();
    this.copyOverlay.visible = false;
  }

  /**
   * Get normalized bounds of current selection (top-left to bottom-right)
   */
  getBounds() {
    if (this.start.row === -1 || this.end.row === -1) {
      return null;
    }

    return {
      minRow: Math.min(this.start.row, this.end.row),
      maxRow: Math.max(this.start.row, this.end.row),
      minCol: Math.min(this.start.col, this.end.col),
      maxCol: Math.max(this.start.col, this.end.col),
    };
  }

  /**
   * Check if a specific cell is within the copy overlay bounds
   */
  isCellInCopyOverlay(row: number, col: number): boolean {
    if (!this.copyOverlay.visible) return false;
    
    // Find the bounds of the copy overlay
    const el = document.querySelector(`div[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
    if (!el) return false;
    
    const cellTop = el.offsetTop;
    const cellLeft = el.offsetLeft;
    const cellRight = cellLeft + el.offsetWidth;
    const cellBottom = cellTop + el.offsetHeight;
    
    const copyTop = this.copyOverlay.top;
    const copyLeft = this.copyOverlay.left;
    const copyRight = copyLeft + this.copyOverlay.width;
    const copyBottom = copyTop + this.copyOverlay.height;
    
    // Check if cell is within copy bounds
    return cellLeft >= copyLeft && 
           cellRight <= copyRight && 
           cellTop >= copyTop && 
           cellBottom <= copyBottom;
  }

  /**
   * Check if selection and copy overlay completely overlap (same region)
   */
  selectionMatchesCopy(): boolean {
    if (!this.selectionOverlay.visible || !this.copyOverlay.visible) return false;
    
    return this.selectionOverlay.top === this.copyOverlay.top &&
           this.selectionOverlay.left === this.copyOverlay.left &&
           this.selectionOverlay.width === this.copyOverlay.width &&
           this.selectionOverlay.height === this.copyOverlay.height;
  }
  hasSelection() {
    return this.start.row !== -1 && this.end.row !== -1;
  }

  /**
   * Get the anchor cell (starting point) for operations
   */
  getAnchor(): GridCell | null {
    return this.start.row !== -1 ? this.start : null;
  }
}