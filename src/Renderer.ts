import { CanvasResizeObserver } from "./CanvasResizeObserver";
import { NoiseShader } from "./NoiseShader";
import { ContourShader } from "./ContourShader";
import {MouseListener} from "./MouseListener";

class Renderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly noiseShader: NoiseShader;
  private readonly contourShader: ContourShader;
  private readonly mouseListener: MouseListener;

  private previousRender: DOMHighResTimeStamp = performance.now();
  private offset = { x: 100, y: 100 };
  private scale = { x: 0, y: 0 };

  constructor(device: GPUDevice, context: GPUCanvasContext) {
    this.device = device;
    this.context = context;

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format });

    this.noiseShader = new NoiseShader(device, context);
    this.contourShader = new ContourShader(device, format);
    this.mouseListener = new MouseListener();
  }

  animate() {
    requestAnimationFrame((delta: DOMHighResTimeStamp) => this.render(delta));
  }

  /**
   * @param time The end time of the previous frame's rendering, in milliseconds elapsed since
   * performance.timeOrigin.
   */
  private render(time: DOMHighResTimeStamp) {
    const delta = (time - this.previousRender) / 1000;
    this.previousRender = time;

    const noiseTexture = this.noiseShader.updateRenderTarget();
    this.contourShader.setInputTexture(noiseTexture.createView());

    const encoder = this.device.createCommandEncoder();
    this.noiseShader.renderPass(encoder);
    this.contourShader.renderPass(encoder, this.context.getCurrentTexture());
    const commandBuffer = encoder.finish();

    this.updateScale()
    this.updatePosition(delta)
    this.noiseShader.updateUniformBuffer(this.scale, this.offset);
    this.contourShader.updateUniformBuffer(this.scale, this.offset);

    this.device.queue.submit([commandBuffer]);
    requestAnimationFrame((delta: DOMHighResTimeStamp) => this.render(delta));
  }

  private updateScale() {
    const height = this.context.canvas.height;
    const width = this.context.canvas.width;
    this.scale = { x: 6 * (width / (height + width)) , y: 6 * (height / (height + width)) }
  }

  /**
   * @param delta Time in seconds since the last update.
   */
  private updatePosition(delta: number) {
    let newPosition = {
      x: this.offset.x,
      y: this.offset.y + (0.1 * delta),
    };

    if (this.mouseListener.inWindow) {
      newPosition.x += (this.mouseListener.position.x * 0.5 * delta);
      newPosition.y -= (this.mouseListener.position.y * 0.5 * delta);
    }

    this.offset = newPosition
  }
}

export async function buildRenderer(canvasId: string) {
  let canvas = document.getElementById(canvasId);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas not found on page.");
  }

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  const context = canvas.getContext("webgpu");

  if (!device || !context) {
    canvas.setAttribute("style", "display:none;");
    throw new Error("WebGPU is not supported.");
  }

  new CanvasResizeObserver(canvas, device);
  return new Renderer(device, context);
}
