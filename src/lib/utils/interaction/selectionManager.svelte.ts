// src/lib/utils/interaction/selectionManager.svelte.ts

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

    // We query the DOM elements. 
    // In virtual scroll, if the row is not rendered, this returns null.
    // The overlay will simply be hidden or clipped for off-screen items.
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
    this.selectionOverlay = this.calculateOverlayRect(this.start, this.end);
  }

  startSelection(row: number, col: number, expand: boolean = false) {
    this.isSelecting = true;

    if (expand && this.start.row !== -1) {
      this.end = { row, col };
      this.updateOverlay();
      return; 
    }

    if (this.start.row === row && this.start.col === col && 
        this.end.row === row && this.end.col === col) {
      this.reset();
      this.isSelecting = false; 
      return;
    }

    this.start = { row, col };
    this.end = { row, col };
    this.updateOverlay();
  }

  extendSelection(row: number, col: number) {
    if (this.isSelecting) {
      this.end = { row, col };
      this.updateOverlay();
    }
  }

  endSelection() {
    this.isSelecting = false;
  }

  moveTo(row: number, col: number) {
    this.start = { row, col };
    this.end = { row, col };
    this.updateOverlay();
  }

  selectCell(row: number, col: number) {
    this.start = { row, col };
    this.end = { row, col };
    this.updateOverlay();
  }

  snapshotAsCopied() {
    const rect = this.calculateOverlayRect(this.start, this.end);
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

  isCellInCopyOverlay(row: number, col: number): boolean {
    if (!this.copyOverlay.visible) return false;
    
    // Simple visual check logic remains the same
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
    
    return cellLeft >= copyLeft && 
           cellRight <= copyRight && 
           cellTop >= copyTop && 
           cellBottom <= copyBottom;
  }

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

  getAnchor(): GridCell | null {
    return this.start.row !== -1 ? this.start : null;
  }
}