// src/lib/grid.ts

export type GridCell = {
  row: number;
  col: number; // Changed from string to number
};

export function getKeyboardNavigation(
  e: KeyboardEvent,
  current: GridCell | null,
  totalRows: number,
  totalCols: number // We only need the count now, not the names
): GridCell | null {
  
  // 1. Safety Checks
  if (!current) return null;
  
  // Don't navigate if user is typing in a search box
  if ((e.target as HTMLElement).tagName === 'INPUT') return null;

  const { row, col } = current;
  
  // 2. Calculate Candidates
  let newRow = row;
  let newCol = col;
  let didMove = false;

  switch (e.key) {
    case 'ArrowUp':
      newRow = Math.max(0, row - 1);
      didMove = true;
      break;
    case 'ArrowDown':
      newRow = Math.min(totalRows - 1, row + 1);
      didMove = true;
      break;
    case 'ArrowLeft':
      newCol = Math.max(0, col - 1);
      didMove = true;
      break;
    case 'ArrowRight':
      newCol = Math.min(totalCols - 1, col + 1);
      didMove = true;
      break;
    case 'Tab':
      didMove = true;
      if (e.shiftKey) {
         newCol = Math.max(0, col - 1);
      } else {
         newCol = Math.min(totalCols - 1, col + 1);
      }
      break;
  }

  // 3. If we moved, prevent default browser scrolling/tabbing and return new coords
  if (didMove) {
    e.preventDefault();
    return { 
      row: newRow, 
      col: newCol
    };
  }

  return null;
}