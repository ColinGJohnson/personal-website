import noiseShader from "./shaders/noise.wgsl";

export class NoiseShader {
  private readonly device: GPUDevice
  private readonly context: GPUCanvasContext
  private readonly renderPipeline: GPURenderPipeline
  private readonly uniformBuffer: GPUBuffer
  private readonly bindGroup: GPUBindGroup
  private readonly renderPassDescriptor: GPURenderPassDescriptor

  private renderTarget?: GPUTexture

  constructor(device: GPUDevice, context: GPUCanvasContext) {
    this.device = device
    this.context = context

    const shaderModule = device.createShaderModule({
      label: 'Noise shader module',
      code: noiseShader,
    });

    this.renderPipeline = device.createRenderPipeline({
      label: 'Noise render pipeline',
      layout: 'auto',
      vertex: {
        module: shaderModule,
      },
      fragment: {
        module: shaderModule,
        targets: [{format: 'rgba8unorm'}],
      },
    });

    this.uniformBuffer = device.createBuffer({
      label: 'Uniforms for scale and offset',
      // 16 bytes: 2 4-byte floats for the scale and 2 floats for the offset
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    this.bindGroup = device.createBindGroup({
      label: 'Bind group for scale and offset',
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {binding: 0, resource: {buffer: this.uniformBuffer}},
      ],
    });

    this.renderPassDescriptor = {
      label: 'Noise render pass descriptor',
      colorAttachments: [
        {
          clearValue: [0.3, 0.3, 0.3, 1],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    } as GPURenderPassDescriptor;
  }

  public renderPass(encoder: GPUCommandEncoder): void {
    const pass = encoder.beginRenderPass(this.renderPassDescriptor);
    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
  }

  public updateRenderTarget(): GPUTexture {
    const canvasTexture = this.context.getCurrentTexture();

    if (this.renderTarget?.width === canvasTexture.width &&
        this.renderTarget?.height === canvasTexture.height) {
      return this.renderTarget;
    }

    this.renderTarget?.destroy();
    this.renderTarget = this.device.createTexture({
      size: canvasTexture,
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    (this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = this.renderTarget?.createView();
    return this.renderTarget;
  }

  public updateUniformBuffer(
      scale: { x: number; y: number },
      offset: { x: number, y: number }
  ): void {
    const uniformValues = new Float32Array([ scale.x, scale.y, offset.x, offset.y ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformValues);
  }
}
