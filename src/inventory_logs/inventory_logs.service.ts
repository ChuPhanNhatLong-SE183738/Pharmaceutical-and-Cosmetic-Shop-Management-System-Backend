import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateInventoryLogDto } from './dto/create-inventory_log.dto';
import { InventoryLog, InventoryLogDocument } from './entities/inventory_log.entity';
import { ProductsService } from '../products/products.service';
import { ReviewInventoryLogDto } from './dto/review-inventory_request.dto';
import { InventoryLogFilterDto } from './dto/inventory_log-filter.dto';

@Injectable()
export class InventoryLogsService {
  private readonly logger = new Logger(InventoryLogsService.name);

  constructor(
    @InjectModel(InventoryLog.name) private inventoryLogModel: Model<InventoryLogDocument>,
    private readonly productsService: ProductsService
  ) {}

  async create(createInventoryLogDto: CreateInventoryLogDto): Promise<InventoryLogDocument> {
    try {
      for (const product of createInventoryLogDto.products) {
        await this.productsService.findOne(product.productId);
      }
      
      const newInventoryLog = new this.inventoryLogModel({
        batch: createInventoryLogDto.batch,
        products: createInventoryLogDto.products,
        action: createInventoryLogDto.action,
        status: 'pending',
        userId: new Types.ObjectId(createInventoryLogDto.userId),
      });
      
      return await newInventoryLog.save();
    } catch (error) {
      this.logger.error(`Error creating inventory log: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw new BadRequestException(`One or more products not found`);
      }
      throw new BadRequestException(`Failed to create inventory log: ${error.message}`);
    }
  }

  async findAll(filterDto?: InventoryLogFilterDto): Promise<{ logs: InventoryLogDocument[], total: number }> {
    try {
      const query: any = {};
      
      if (filterDto) {
        if (filterDto.productId) {
          query['products.productId'] = filterDto.productId;
        }
        
        if (filterDto.status) {
          query.status = filterDto.status;
        }
        
        if (filterDto.userId) {
          query.userId = new Types.ObjectId(filterDto.userId);
        }
      }
      
      const logs = await this.inventoryLogModel.find(query)
        .populate('products.productId', 'productName price')
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .exec();
        
      const total = await this.inventoryLogModel.countDocuments(query);
      
      return { logs, total };
    } catch (error) {
      this.logger.error(`Error finding inventory logs: ${error.message}`);
      throw new BadRequestException(`Failed to retrieve inventory logs: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<InventoryLogDocument> {
    try {
      const inventoryLog = await this.inventoryLogModel.findById(id)
        .populate('products.productId', 'productName price')
        .populate('userId', 'fullName email')
        .exec();
      
      if (!inventoryLog) {
        throw new NotFoundException(`Inventory log with ID ${id} not found`);
      }
      
      return inventoryLog;
    } catch (error) {
      this.logger.error(`Error finding inventory log: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retrieve inventory log: ${error.message}`);
    }
  }

  async reviewInventoryRequest(id: string, reviewDto: ReviewInventoryLogDto): Promise<InventoryLogDocument> {
    try {
      const inventoryLog = await this.findOne(id);
      
      if (inventoryLog.status !== 'pending') {
        throw new BadRequestException(`Inventory log has already been ${inventoryLog.status}`);
      }
      
      if (!reviewDto.approved) {
        if (!reviewDto.reason) {
          throw new BadRequestException('Rejection reason is required when rejecting an inventory request');
        }
        
        inventoryLog.status = 'denied';
        inventoryLog['rejectionReason'] = reviewDto.reason;
        return await inventoryLog.save();
      }
      
      const { action } = inventoryLog;
  

      for (const item of inventoryLog.products) {
        let productId: string;

        if (typeof item.productId === 'string') {
          productId = item.productId;
        } else if (
          typeof item.productId === 'object' &&
          item.productId !== null &&
          ('_id' in item.productId)
        ) {
          productId = (item.productId as { _id: Types.ObjectId })._id.toString();
        } else if (
          typeof item.productId === 'object' &&
          item.productId !== null &&
          typeof (item.productId as Types.ObjectId).toString === 'function'
        ) {
          productId = (item.productId as Types.ObjectId).toString();
        } else {
          throw new BadRequestException(`Invalid product reference in inventory log: ${item.productId}`);
        }

        const quantity = item.quantity;

        this.logger.debug(`Processing ${action} for product ID: ${productId} with quantity: ${quantity}`);
        
        try {
          if (action === 'import') {
            await this.productsService.incrementStock(productId, quantity);
          } else if (action === 'export') {
            await this.productsService.decrementStock(productId, quantity);
          }
        } catch (error) {
          this.logger.error(`Error updating product stock: ${error.message}`);
          throw new BadRequestException(`Error updating stock for product ${productId}: ${error.message}`);
        }
      }
      
      inventoryLog.status = 'completed';
      return await inventoryLog.save();
    } catch (error) {
      this.logger.error(`Error reviewing inventory request: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to review inventory request: ${error.message}`);
    }
  }

  async getPendingRequests(): Promise<InventoryLogDocument[]> {
    return this.inventoryLogModel.find({ status: 'pending' })
      .populate('products.productId', 'productName price')
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

async getInventoryLogsByProduct(productId: string): Promise<InventoryLogDocument[]> {
  this.logger.debug(`Finding inventory logs for product ID: ${productId}`);
  return this.inventoryLogModel.find({
    'products.productId': new Types.ObjectId(productId),
    status: 'completed'
  })
    .populate('products.productId', 'productName price')
    .populate('userId', 'fullName email')
    .sort({ createdAt: -1 })
    .exec();
}

  async getInventoryLogsByUser(userId: string): Promise<InventoryLogDocument[]> {
    return this.inventoryLogModel.find({ userId: new Types.ObjectId(userId) })
      .populate('products.productId', 'productName price')
      .sort({ createdAt: -1 })
      .exec();
  }
}
