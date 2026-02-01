import contourShader from "./shaders/contour.wgsl";

export class ContourShader {
  private device: GPUDevice;
  private bindGroup?: GPUBindGroup;
  private readonly renderPipeline: GPURenderPipeline;
  private readonly sampler: GPUSampler;
  private readonly uniformBuffer: GPUBuffer;
  private readonly renderPassDescriptor: GPURenderPassDescriptor;

  constructor(device: GPUDevice, presentationFormat: GPUTextureFormat) {
    this.device = device;

    this.uniformBuffer = device.createBuffer({
      label: "Uniforms for scale and offset",
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = device.createShaderModule({
      label: "Contour shader module",
      code: contourShader,
    });

    this.renderPipeline = device.createRenderPipeline({
      label: "Contour render pipeline",
      layout: "auto",
      vertex: { module: shaderModule },
      fragment: {
        module: shaderModule,
        targets: [{ format: presentationFormat }],
      },
    });

    this.sampler = device.createSampler({
      label: "Contour sampler",
      minFilter: "linear",
      magFilter: "linear",
    });

    this.renderPassDescriptor = {
      label: "Contour render pass",
      colorAttachments: [{ loadOp: "clear", storeOp: "store" }],
    } as GPURenderPassDescriptor;
  }

  public setInputTexture(inputTexture: GPUTextureView) {
    this.bindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: inputTexture },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  public updateUniformBuffer(
    scale: { x: number; y: number },
    offset: { x: number; y: number },
  ): void {
    const uniformValues = new Float32Array([scale.x, scale.y, offset.x, offset.y ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformValues);
  }

  public renderPass(encoder: GPUCommandEncoder, dstTexture: GPUTexture) {
    (this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = dstTexture.createView();
    const pass = encoder.beginRenderPass(this.renderPassDescriptor);
    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
  }
}
