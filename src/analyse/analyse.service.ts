import { Injectable } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export interface AnalyseResult {
  analyseIndex: number;
  skinType: string;
}

@Injectable()
export class AnalyseService {
  private modelPath: string;
  private session?: ort.InferenceSession;
  private labels: string[];

  constructor() {
    this.modelPath = path.join(process.cwd(), 'public', 'model.onnx');
    this.labels = ['oily', 'dry', 'normal'];
    this.initModel();
  }

  private async initModel() {
    try {
      // Create the inference session using the proper API
      this.session = await ort.InferenceSession.create(this.modelPath);
    } catch (error) {
      console.error('Error initializing ONNX model:', error);
    }
  }

  async runInference(imageBuffer: Buffer): Promise<AnalyseResult> {
    // Process image with sharp
    const { data, info } = await sharp(imageBuffer)
      .resize(224, 224)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const floatData = new Float32Array(3 * 224 * 224);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    // Normalize the image
    for (let i = 0; i < 224 * 224; i++) {
      for (let c = 0; c < 3; c++) {
        floatData[c * 224 * 224 + i] =
          (data[i * 3 + c] / 255 - mean[c]) / std[c];
      }
    }

    // Create tensor and run inference
    const inputTensor = new ort.Tensor('float32', floatData, [1, 3, 224, 224]);

    if (!this.session) {
      throw new Error('Model not initialized');
    }

    const outputs = await this.session.run({ input: inputTensor });
    const outputData = outputs.output.data as Float32Array;
    const analyseIndex = Array.from(outputData).indexOf(
      Math.max(...Array.from(outputData)),
    );

    return {
      analyseIndex,
      skinType: this.labels[analyseIndex],
    };
  }
}
