import { CanvasResizeObserver } from "./CanvasResizeObserver";
import { NoiseShader } from "./NoiseShader";
import { ContourShader } from "./ContourShader";

class Renderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly start: number;
  private readonly noiseShader: NoiseShader;
  private readonly contourShader: ContourShader;

  private mousePosition = { x: 0, y: 0 };

  constructor(device: GPUDevice, context: GPUCanvasContext) {
    this.start = Date.now();
    this.device = device;
    this.context = context;

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format });

    this.noiseShader = new NoiseShader(device, context);
    this.contourShader = new ContourShader(device, format);

    document.addEventListener("mousemove", (e: MouseEvent) => {
      this.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  animate() {
    requestAnimationFrame(() => this.render());
  }

  private render() {
    const seconds = (Date.now() - this.start) / 1000;
    const zoom = Math.min(
      1,
      this.mousePosition.x * this.mousePosition.x +
        this.mousePosition.y * this.mousePosition.y,
    );
    const ratio = this.context.canvas.width / this.context.canvas.height;

    const noiseTexture = this.noiseShader.updateRenderTarget();
    this.contourShader.setInputTexture(noiseTexture.createView());

    const encoder = this.device.createCommandEncoder();
    this.noiseShader.renderPass(encoder);
    this.contourShader.renderPass(encoder, this.context.getCurrentTexture());
    const commandBuffer = encoder.finish();

    this.noiseShader.updateUniformBuffer(
      { x: 2 * ratio + zoom, y: 2 + zoom },
      { x: 100, y: 100 + seconds / 10 },
    );
    this.device.queue.submit([commandBuffer]);
    requestAnimationFrame(() => this.render());
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
