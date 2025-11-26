// $lib/utils/virtualScrollManager.svelte.ts

export class VirtualScrollManager {
  // Configuration
  rowHeight = 32; // Height of each row in pixels (h-8 = 2rem = 32px)
  overscan = 15; // Extra rows to render above/below viewport for smooth scrolling (increased from 5)
  
  // State
  scrollTop = $state(0);
  containerHeight = $state(0);
  
  // Computed visible range
  get visibleRange() {
    const startIndex = Math.max(0, Math.floor(this.scrollTop / this.rowHeight) - this.overscan);
    const visibleCount = Math.ceil(this.containerHeight / this.rowHeight);
    const endIndex = startIndex + visibleCount + (this.overscan * 2);
    
    return { startIndex, endIndex };
  }
  
  /**
   * Get the subset of data to actually render
   */
  getVisibleItems<T>(data: T[]): { items: T[]; startIndex: number; endIndex: number } {
    const { startIndex, endIndex } = this.visibleRange;
    const clampedEnd = Math.min(endIndex, data.length);
    
    return {
      items: data.slice(startIndex, clampedEnd),
      startIndex,
      endIndex: clampedEnd
    };
  }
  
  /**
   * Calculate total height of all rows (for scrollbar)
   */
  getTotalHeight(itemCount: number): number {
    return itemCount * this.rowHeight;
  }
  
  /**
   * Calculate offset for the visible window
   */
  getOffsetY(): number {
    return this.visibleRange.startIndex * this.rowHeight;
  }
  
  /**
   * Handle scroll event
   */
  handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    this.scrollTop = target.scrollTop;
  }
  
  /**
   * Handle container resize
   */
  updateContainerHeight(height: number) {
    this.containerHeight = height;
  }
  
  /**
   * Scroll to a specific row index
   */
  scrollToRow(index: number, container: HTMLElement | null) {
    if (!container) return;
    
    const targetScrollTop = index * this.rowHeight;
    container.scrollTop = targetScrollTop;
    this.scrollTop = targetScrollTop;
  }
  
  /**
   * Get the actual row index from a visible index
   */
  getActualIndex(visibleIndex: number): number {
    return this.visibleRange.startIndex + visibleIndex;
  }
  
  /**
   * Check if a row index is currently visible
   */
  isRowVisible(index: number): boolean {
    const { startIndex, endIndex } = this.visibleRange;
    return index >= startIndex && index < endIndex;
  }
}