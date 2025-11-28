// $lib/utils/interaction/editManager.svelte.ts
import type { ColumnWidthManager } from '../core/columnManager.svelte';
import type { RowHeightManager } from '../core/rowManager.svelte';

export type EditState = {
  row: number;
  col: number;
  key: string;
  originalValue: string;
  originalColumnWidth: number;
}

export class EditManager {
  // Current edit state
  isEditing = $state(false);
  editState = $state<EditState | null>(null);
  
  // Input value (bound to textarea)
  inputValue = $state('');

  /**
   * Start editing a cell
   */
  startEdit(
    row: number,
    col: number,
    key: string,
    currentValue: string,
    columnManager: ColumnWidthManager,
    rowManager: RowHeightManager
  ) {
    // Store original state
    const originalWidth = columnManager.getWidth(key);
    
    this.editState = {
      row,
      col,
      key,
      originalValue: currentValue,
      originalColumnWidth: originalWidth
    };
    
    this.inputValue = currentValue;
    this.isEditing = true;

    // Expand column (up to 300px max)
    const contentWidth = this.calculateContentWidth(currentValue);
    const expandedWidth = Math.min(300, Math.max(originalWidth, contentWidth));
    columnManager.setWidth(key, expandedWidth);

    // Initially set row to default height
    // We'll calculate actual height after textarea renders
    rowManager.setHeight(row, 32);
  }

  /**
   * Update row height based on textarea content
   * Call this after the textarea has rendered
   * Only expands if content wraps (width > 300px requires multiple lines)
   */
  updateRowHeight(textareaElement: HTMLTextAreaElement | null, rowManager: RowHeightManager, columnManager: ColumnWidthManager) {
    if (!this.editState || !textareaElement) return;

    const currentColumnWidth = columnManager.getWidth(this.editState.key);
    
    // Only expand row height if column is at max width (300px)
    // This means content is wrapping
    if (currentColumnWidth >= 300) {
      // Get the scroll height of the textarea (actual content height)
      const contentHeight = textareaElement.scrollHeight;
      
      // Add some padding (8px top + 8px bottom = 16px total)
      const paddingHeight = 16;
      const totalHeight = contentHeight + paddingHeight;
      
      // Set minimum to default row height (32px)
      const finalHeight = Math.max(32, totalHeight);
      
      rowManager.setHeight(this.editState.row, finalHeight);
    } else {
      // Column hasn't maxed out yet, keep default height
      rowManager.setHeight(this.editState.row, 32);
    }
  }

  /**
   * Calculate approximate width needed for content
   */
  private calculateContentWidth(text: string): number {
    // Rough approximation: 8px per character average
    const charWidth = 8;
    const padding = 16; // px-2 = 8px left + 8px right
    
    const estimatedWidth = (text.length * charWidth) + padding;
    
    return Math.min(300, estimatedWidth);
  }

  /**
   * Save the edited value
   */
  async save(
    assets: any[],
    onHistoryRecord: (id: number | string, key: string, oldValue: string, newValue: string) => void,
    columnManager: ColumnWidthManager,
    rowManager: RowHeightManager
  ): Promise<boolean> {
    if (!this.editState) return false;

    const { row, key, originalValue, originalColumnWidth } = this.editState;
    const newValue = this.inputValue.trim();

    // Update the data
    const asset = assets[row];
    if (!asset) return false;

    // Only record history if value actually changed
    if (originalValue !== newValue) {
      asset[key] = newValue;
      onHistoryRecord(asset.id, key, originalValue, newValue);
    }

    // Reset column and row
    columnManager.setWidth(key, originalColumnWidth);
    rowManager.resetHeight(row);

    // Clear edit state
    this.isEditing = false;
    this.editState = null;
    this.inputValue = '';

    return true;
  }

  /**
   * Cancel editing and restore original state
   */
  cancel(columnManager: ColumnWidthManager, rowManager: RowHeightManager) {
    if (!this.editState) return;

    const { key, originalColumnWidth, row } = this.editState;

    // Reset column and row IMMEDIATELY (synchronously)
    columnManager.setWidth(key, originalColumnWidth);
    rowManager.resetHeight(row);

    // Clear edit state
    this.isEditing = false;
    this.editState = null;
    this.inputValue = '';
  }

  /**
   * Get the current edit position (for rendering)
   */
  getEditPosition(): { row: number; col: number } | null {
    if (!this.editState) return null;
    return { row: this.editState.row, col: this.editState.col };
  }

  /**
   * Check if a specific cell is being edited
   */
  isEditingCell(row: number, col: number): boolean {
    if (!this.editState) return false;
    return this.editState.row === row && this.editState.col === col;
  }
}