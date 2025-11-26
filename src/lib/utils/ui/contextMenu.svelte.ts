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
    
    // Estimate menu width (min-w-32 is 128px, usually ~150px with content)
    const estimatedWidth = 130; 
    const windowWidth = window.innerWidth;

    // If opening to the right goes off-screen, open to the left
    if (e.clientX + estimatedWidth > windowWidth) {
      this.x = e.clientX - estimatedWidth;
    } else {
      this.x = e.clientX;
    }

    this.y = e.clientY;
    this.row = row;
    this.col = col;
  }

  close() {
    this.visible = false;
  }
}