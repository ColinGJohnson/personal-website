/**
 * Synchronizes an HTML canvas element's drawing buffer size with its display size.
 * https://webgpufundamentals.org/webgpu/lessons/webgpu-resizing-the-canvas.html
 */
export class CanvasResizeObserver {

  /**
   * @param canvas The Canvas whole size to update.
   * @param device The GPUDevice being used to render to the canvas.
   */
  constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (!(entry.target instanceof HTMLCanvasElement)) {
          continue
        }

        const width = entry.devicePixelContentBoxSize?.[0].inlineSize ||
            entry.contentBoxSize[0].inlineSize * devicePixelRatio;
        const height = entry.devicePixelContentBoxSize?.[0].blockSize ||
            entry.contentBoxSize[0].blockSize * devicePixelRatio;

        const canvas = entry.target;
        canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
        canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      }
    });

    try {
      observer.observe(canvas, {box: 'device-pixel-content-box'});
    } catch {
      observer.observe(canvas, {box: 'content-box'});
    }
  }
}
