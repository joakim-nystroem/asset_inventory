export class EditingManager {
  active = $state(false);
  row = $state(-1);
  col = $state(-1);
  key = $state('');
  
  // The value currently being edited
  value = $state('');
  
  // Original value for rollback/comparison
  originalValue = '';

  // [Added] Temporary height for the row being edited
  tempRowHeight = $state(32);

  start(row: number, col: number, key: string, initialValue: any) {
    this.active = true;
    this.row = row;
    this.col = col;
    this.key = key;
    this.value = String(initialValue ?? '');
    this.originalValue = this.value;
    this.tempRowHeight = 32; // Reset height
  }

  save() {
    const change = {
      row: this.row,
      col: this.col,
      key: this.key,
      value: this.value
    };
    this.close();
    return change;
  }

  close() {
    this.active = false;
    this.row = -1;
    this.col = -1;
    this.key = '';
    this.value = '';
    this.tempRowHeight = 32;
  }

  isOpen(row: number, col: number) {
    return this.active && this.row === row && this.col === col;
  }

  // [Added] Helper to check if a specific row is being edited
  isEditingRow(row: number) {
    return this.active && this.row === row;
  }
}