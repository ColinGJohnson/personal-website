import {CanvasResizeObserver} from "./resize-observer";

import noiseShader from "./shaders/noise.wgsl";
import contourShader from "./shaders/contour.wgsl"

import './styles.css';

async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    document.getElementById("webgpu-canvas").setAttribute("style", "display:none;");
    document.getElementById("no-webgpu").setAttribute("style", "display:block;");
    return;
  }

  const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  const module = device.createShaderModule({
    label: 'Gradient noise shader module',
    code: noiseShader,
  });

  const pipeline = device.createRenderPipeline({
    label: 'Gradient noise render pipeline',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{format: 'rgba8unorm'}],
    },
  });

  const uniformBuffer = device.createBuffer({
    label: 'Uniforms for scale and offset',
    // 16 bytes: 2 4-byte floats for the scale and 2 floats for the offset
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {binding: 0, resource: {buffer: uniformBuffer}},
    ],
  });

  const renderPassDescriptor = {
    label: 'Canvas renderPass',
    colorAttachments: [
      {
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  } as GPURenderPassDescriptor;

  const postProcessModule = device.createShaderModule({
    label: 'Contour map shader module',
    code: contourShader,
  });

  const postProcessPipeline = device.createRenderPipeline({
    label: 'Gradient noise render pipeline',
    layout: 'auto',
    vertex: {module: postProcessModule},
    fragment: {
      module: postProcessModule,
      targets: [{format: presentationFormat}],
    },
  });

  const postProcessSampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const postProcessRenderPassDescriptor = {
    label: 'post process render pass',
    colorAttachments: [
      {loadOp: 'clear', storeOp: 'store'},
    ],
  } as GPURenderPassDescriptor;

  let renderTarget: GPUTexture;
  let postProcessBindGroup: GPUBindGroup;

  function setupPostProcess(canvasTexture: GPUTexture) {
    if (renderTarget?.width === canvasTexture.width &&
        renderTarget?.height === canvasTexture.height) {
      return;
    }

    renderTarget?.destroy();
    renderTarget = device.createTexture({
      size: canvasTexture,
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    let renderTargetView = renderTarget.createView();

    // TODO: This type cast is suspicious
    (renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = renderTargetView;

    postProcessBindGroup = device.createBindGroup({
      layout: postProcessPipeline.getBindGroupLayout(0),
      entries: [
        {binding: 0, resource: renderTargetView},
        {binding: 1, resource: postProcessSampler},
      ],
    });
  }

  function postProcess(encoder: GPUCommandEncoder, srcTexture: GPUTexture, dstTexture: GPUTexture) {
    (postProcessRenderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = dstTexture.createView();
    const pass = encoder.beginRenderPass(postProcessRenderPassDescriptor);
    pass.setPipeline(postProcessPipeline);
    pass.setBindGroup(0, postProcessBindGroup);
    pass.draw(3);
    pass.end();
  }

  let start = Date.now()

  function render() {
    const seconds = (Date.now() - start) / 1000;
    // const zoom = Math.sin(seconds / 10) * 0.5 + 0.5;
    const zoom = 0;
    const ratio = canvas.width / canvas.height;
    const uniformValues = new Float32Array([
      2 * ratio + zoom, // x scale
      2 + zoom, // y scale
      100, // x offset
      100 + seconds / 10 // y offset
    ]);

    const canvasTexture = context.getCurrentTexture();
    setupPostProcess(canvasTexture);

    const encoder = device.createCommandEncoder({
      label: 'Command encoder'
    });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();

    postProcess(encoder, renderTarget, canvasTexture)

    const commandBuffer = encoder.finish();
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  // https://webgpufundamentals.org/webgpu/lessons/webgpu-resizing-the-canvas.html
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

(async () => {
  void main();
})();
