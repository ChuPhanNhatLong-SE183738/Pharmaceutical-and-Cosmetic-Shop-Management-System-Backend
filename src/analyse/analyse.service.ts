import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as ort from 'onnxruntime-node';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { Analyse, AnalyseDocument } from './entities/analyse.entity';
import { CreateAnalyseDto } from './dto/create-analyse.dto';
import { UpdateAnalyseDto } from './dto/update-analyse.dto';
import { ProductsService } from '../products/products.service';

export interface AnalyseResult {
  analyseIndex: number;
  skinType: string;
}

@Injectable()
export class AnalyseService {
  private modelPath: string;
  private session?: ort.InferenceSession;
  private labels: string[];
  private readonly logger = new Logger(AnalyseService.name);

  constructor(
    @InjectModel(Analyse.name) private analyseModel: Model<AnalyseDocument>,
    private productsService: ProductsService,
  ) {
    this.modelPath = path.join(process.cwd(), 'public', 'model.onnx');
    this.labels = [
      'Acne',
      'Blackheads',
      'Dark Spots',
      'Dry Skin',
      'Normal Skin',
      'Oily Skin',
      'Wrinkles',
    ];
    this.initModel();
  }

  private async initModel() {
    try {
      // Create the inference session using the proper API
      this.session = await ort.InferenceSession.create(this.modelPath);
      this.logger.log('ONNX model initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing ONNX model:', error);
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

  async saveAnalysis(
    createAnalyseDto: CreateAnalyseDto,
  ): Promise<AnalyseDocument> {
    try {
      const newAnalysis = new this.analyseModel({
        userId: new Types.ObjectId(createAnalyseDto.userId),
        imageUrl: createAnalyseDto.imageUrl,
        skinType: createAnalyseDto.skinType,
        analysisDate: new Date(),
        recommendedProducts:
          createAnalyseDto.recommendedProducts?.map((rec) => ({
            ...rec,
            productId: new Types.ObjectId(rec.productId),
          })) || [],
      });

      return await newAnalysis.save();
    } catch (error) {
      this.logger.error(`Error saving analysis: ${error.message}`);
      throw new BadRequestException(
        `Failed to save analysis: ${error.message}`,
      );
    }
  }

  async generateRecommendations(skinType: string): Promise<any[]> {
    try {
      const { products } = await this.productsService.findAll({
        search: skinType,
        limit: 5,
      });

      return products.map((product, index) => ({
        recommendationId: `rec-${index + 1}-${Date.now()}`,
        productId: (product._id as Types.ObjectId | string).toString(),
        reason: `Suitable for ${skinType} skin type`,
      }));
    } catch (error) {
      this.logger.error(`Error generating recommendations: ${error.message}`);
      return [];
    }
  }

  async processAndSaveAnalysis(
    imageBuffer: Buffer,
    userId: string,
    imageUrl: string,
  ): Promise<AnalyseDocument> {
    const { skinType } = await this.runInference(imageBuffer);

    const recommendations = await this.generateRecommendations(skinType);

    const analysisData: CreateAnalyseDto = {
      userId,
      imageUrl,
      skinType,
      recommendedProducts: recommendations,
    };

    return this.saveAnalysis(analysisData);
  }

  async findByUserId(userId: string): Promise<AnalyseDocument[]> {
    return this.analyseModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .sort({ analysisDate: -1 })
      .exec();
  }

  async findOne(id: string): Promise<AnalyseDocument> {
    const analysis = await this.analyseModel
      .findById(id)
      .populate({
        path: 'recommendedProducts.productId',
        select: 'productName price productImages',
      })
      .exec();

    if (!analysis) {
      throw new NotFoundException(`Analysis with ID ${id} not found`);
    }

    return analysis;
  }

  async update(
    id: string,
    updateAnalyseDto: UpdateAnalyseDto,
  ): Promise<AnalyseDocument> {
    const analysis = await this.analyseModel.findById(id);

    if (!analysis) {
      throw new NotFoundException(`Analysis with ID ${id} not found`);
    }

    if (updateAnalyseDto.skinType) {
      analysis.skinType = updateAnalyseDto.skinType;
    }

    if (updateAnalyseDto.recommendedProducts) {
      analysis.recommendedProducts = updateAnalyseDto.recommendedProducts.map(
        (rec) => ({
          ...rec,
          productId: new Types.ObjectId(rec.productId),
        }),
      );
    }

    return analysis.save();
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.analyseModel.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Analysis with ID ${id} not found`);
    }

    return { deleted: true };
  }
}
