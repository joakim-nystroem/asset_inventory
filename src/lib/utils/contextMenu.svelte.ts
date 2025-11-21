// src/lib/utils/contextMenu.svelte.ts

export class ContextMenuState {
  visible = $state(false);
  x = $state(0);
  y = $state(0);
  row = $state(-1);
  col = $state(-1);

  open(e: MouseEvent, row: number, col: number) {
    e.preventDefault(); // Stop browser menu
    this.visible = true;
    this.x = e.clientX;
    this.y = e.clientY;
    this.row = row;
    this.col = col;
  }

  close() {
    this.visible = false;
  }
}

