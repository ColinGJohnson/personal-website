
export class MouseListener {

  /**
   * The position of the mouse relative to the center of the screen
   * (-1, -1) is the top left, and (1, 1) is the bottom right.
   */
  position = { x: 0, y: 0 };
  inWindow: boolean = false;

  constructor() {
    document.addEventListener("mousemove", (e: MouseEvent) => {
      this.position.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.position.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    document.addEventListener('mouseenter', () => {
      this.inWindow = true;
    });

    document.addEventListener('mouseleave', () => {
      this.inWindow = false;
    });
  }
}
