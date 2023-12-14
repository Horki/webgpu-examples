import { copyToBuffer, createPng, Dimensions } from "./utils.ts";
import { createCapture } from "std/webgpu/create_capture.ts";

export class Framework {
  device: GPUDevice;
  dimensions: Dimensions;

  static async getDevice({
    requiredFeatures,
    optionalFeatures,
  }: {
    requiredFeatures?: GPUFeatureName[];
    optionalFeatures?: GPUFeatureName[];
  } = {}): Promise<GPUDevice> {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null) throw new Error(`Could not find adapter`);
    const device = await adapter.requestDevice({
      requiredFeatures: (requiredFeatures ?? []).concat(
        optionalFeatures?.filter((feature) =>
          adapter.features ? adapter.features.has(feature) : false
        ) ?? [],
      ),
    });

    if (!device) {
      throw new Error("no suitable adapter found");
    }

    device.pushErrorScope("validation");

    return device;
  }

  constructor(dimensions: Dimensions, device: GPUDevice) {
    this.dimensions = dimensions;
    this.device = device;
  }

  async init() {}
  render(_encoder: GPUCommandEncoder, _view: GPUTextureView) {}

  async renderPng() {
    await this.init();
    const { texture, outputBuffer } = createCapture(
      this.device,
      this.dimensions.width,
      this.dimensions.height,
    );
    const encoder = this.device.createCommandEncoder();
    this.render(encoder, texture.createView());
    copyToBuffer(encoder, texture, outputBuffer, this.dimensions);
    this.device.queue.submit([encoder.finish()]);

    const error = await this.device.popErrorScope();
    if (error) {
      throw error;
    }

    await createPng(outputBuffer, this.dimensions);
  }
}
