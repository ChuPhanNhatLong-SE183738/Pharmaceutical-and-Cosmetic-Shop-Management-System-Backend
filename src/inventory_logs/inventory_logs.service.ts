import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateInventoryLogDto } from './dto/create-inventory_log.dto';
import {
  InventoryLog,
  InventoryLogDocument,
  InventoryLogItems,
} from './entities/inventory_log.entity';
import { ProductsService } from '../products/products.service';
import { ReviewInventoryLogDto } from './dto/review-inventory_request.dto';
import { InventoryLogFilterDto } from './dto/inventory_log-filter.dto';

@Injectable()
export class InventoryLogsService {
  private readonly logger = new Logger(InventoryLogsService.name);

  constructor(
    @InjectModel(InventoryLog.name)
    private inventoryLogModel: Model<InventoryLogDocument>,
    @InjectModel(InventoryLogItems.name)
    private inventoryLogItemsModel: Model<InventoryLogItems>,
    private readonly productsService: ProductsService,
  ) {}
  async create(
    createInventoryLogDto: CreateInventoryLogDto,
  ): Promise<InventoryLogDocument> {
    try {
      for (const product of createInventoryLogDto.products) {
        await this.productsService.findOne(product.productId);
      }

      const newInventoryLog = new this.inventoryLogModel({
        batch: createInventoryLogDto.batch,
        action: createInventoryLogDto.action,
        status: 'pending',
        userId: new Types.ObjectId(createInventoryLogDto.userId),
      });

      const savedInventoryLog = await newInventoryLog.save();
      const inventoryLogItems = createInventoryLogDto.products.map(
        (product) => ({
          inventoryLogId: savedInventoryLog._id,
          productId: new Types.ObjectId(product.productId),
          quantity: product.quantity,
          expirtyDate: new Date(product.expirtyDate),
          price: product.price,
        }),
      );

      await this.inventoryLogItemsModel.insertMany(inventoryLogItems);

      return savedInventoryLog;
    } catch (error) {
      this.logger.error(`Error creating inventory log: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw new BadRequestException(`One or more products not found`);
      }
      throw new BadRequestException(
        `Failed to create inventory log: ${error.message}`,
      );
    }
  }
  async findAll(
    filterDto?: InventoryLogFilterDto,
  ): Promise<{ logs: any[]; total: number }> {
    try {
      const query: any = {};
      if (filterDto) {
        if (filterDto.productId) {
          const inventoryLogItems = await this.inventoryLogItemsModel.find({
            productId: new Types.ObjectId(filterDto.productId),
          });
          const inventoryLogIds = inventoryLogItems.map(
            (item) => item.inventoryLogId,
          );
          query._id = { $in: inventoryLogIds };
        }

        if (filterDto.status) {
          query.status = filterDto.status;
        }

        if (filterDto.userId) {
          query.userId = new Types.ObjectId(filterDto.userId);
        }

        if (filterDto.action) {
          query.action = filterDto.action;
        }

        if (filterDto.batch) {
          query.batch = { $regex: filterDto.batch, $options: 'i' };
        }
      }

      const logs = await this.inventoryLogModel
        .find(query)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .exec();

      // Populate inventory log items for each log
      const logsWithItems = await Promise.all(
        logs.map(async (log) => {
          const inventoryLogItems = await this.inventoryLogItemsModel
            .find({ inventoryLogId: log._id })
            .populate('productId', 'productName price stock')
            .exec();

          return {
            ...log.toObject(),
            items: inventoryLogItems,
          };
        }),
      );

      const total = await this.inventoryLogModel.countDocuments(query);

      return { logs: logsWithItems, total };
    } catch (error) {
      this.logger.error(`Error finding inventory logs: ${error.message}`);
      throw new BadRequestException(
        `Failed to retrieve inventory logs: ${error.message}`,
      );
    }
  }
  async findOne(id: string): Promise<any> {
    try {
      const inventoryLog = await this.inventoryLogModel
        .findById(id)
        .populate('userId', 'fullName email')
        .exec();

      if (!inventoryLog) {
        throw new NotFoundException(`Inventory log with ID ${id} not found`);
      }

      const inventoryLogItems = await this.inventoryLogItemsModel
        .find({ inventoryLogId: inventoryLog._id })
        .populate('productId', 'productName price stock')
        .exec();

      return {
        ...inventoryLog.toObject(),
        items: inventoryLogItems,
      };
    } catch (error) {
      this.logger.error(`Error finding inventory log: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve inventory log: ${error.message}`,
      );
    }
  }
  async reviewInventoryRequest(
    id: string,
    reviewDto: ReviewInventoryLogDto,
  ): Promise<InventoryLogDocument> {
    try {
      const inventoryLog = await this.findOne(id);

      if (inventoryLog.status !== 'pending') {
        throw new BadRequestException(
          `Inventory log has already been ${inventoryLog.status}`,
        );
      }

      if (!reviewDto.approved) {
        if (!reviewDto.reason) {
          throw new BadRequestException(
            'Rejection reason is required when rejecting an inventory request',
          );
        }

        inventoryLog.status = 'denied';
        inventoryLog.reason = reviewDto.reason;
        return await inventoryLog.save();
      }

      const { action } = inventoryLog;

      // Get inventory log items for this inventory log
      const inventoryLogItems = await this.inventoryLogItemsModel
        .find({
          inventoryLogId: inventoryLog._id,
        })
        .populate('productId', 'productName price')
        .exec();

      // Process each product in the inventory log items
      for (const item of inventoryLogItems) {
        let productId: string;

        if (typeof item.productId === 'string') {
          productId = item.productId;
        } else if (item.productId && typeof item.productId === 'object') {
          // If it's a populated object with _id
          if ('_id' in item.productId) {
            productId = (item.productId as any)._id.toString();
          }
          // If it's a direct ObjectId
          else if (Types.ObjectId.isValid(item.productId)) {
            productId = (item.productId as Types.ObjectId).toString();
          } else {
            throw new BadRequestException(
              `Invalid product reference in inventory log: ${item.productId}`,
            );
          }
        } else {
          throw new BadRequestException(
            `Invalid product reference in inventory log: ${item.productId}`,
          );
        }

        const quantity = item.quantity;

        this.logger.debug(
          `Processing ${action} for product ID: ${productId} with quantity: ${quantity}`,
        );

        try {
          if (action === 'import') {
            await this.productsService.incrementStock(productId, quantity);
          } else if (action === 'export') {
            await this.productsService.decrementStock(productId, quantity);
          }
        } catch (error) {
          this.logger.error(`Error updating product stock: ${error.message}`);
          throw new BadRequestException(
            `Error updating stock for product ${productId}: ${error.message}`,
          );
        }
      }

      inventoryLog.status = 'completed';
      return await inventoryLog.save();
    } catch (error) {
      this.logger.error(`Error reviewing inventory request: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to review inventory request: ${error.message}`,
      );
    }
  }
  async getPendingRequests(): Promise<InventoryLogDocument[]> {
    return this.inventoryLogModel
      .find({ status: 'pending' })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getInventoryLogsByProduct(
    productId: string,
  ): Promise<InventoryLogDocument[]> {
    this.logger.debug(`Finding inventory logs for product ID: ${productId}`);

    // First find inventory log items with the product ID
    const inventoryLogItems = await this.inventoryLogItemsModel.find({
      productId: new Types.ObjectId(productId),
    });
    const inventoryLogIds = inventoryLogItems.map(
      (item) => item.inventoryLogId,
    );

    return this.inventoryLogModel
      .find({
        _id: { $in: inventoryLogIds },
        status: { $in: ['completed', 'denied'] },
      })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getInventoryLogsByUser(
    userId: string,
  ): Promise<InventoryLogDocument[]> {
    return this.inventoryLogModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getInventoryLogItems(inventoryLogId: string) {
    return this.inventoryLogItemsModel
      .find({
        inventoryLogId: new Types.ObjectId(inventoryLogId),
      })
      .populate('productId', 'productName price')
      .exec();
  }

  async processExpiredProducts(checkDate?: Date): Promise<{
    processedItems: any[];
    totalExpiredItems: number;
    totalQuantityRemoved: number;
    summary: {
      [productId: string]: {
        productName: string;
        totalQuantityRemoved: number;
      };
    };
  }> {
    try {
      const currentDate = checkDate || new Date();
      this.logger.log(
        `Processing expired products as of ${currentDate.toISOString()}`,
      );

      const expiredItems = await this.inventoryLogItemsModel
        .find({
          expirtyDate: { $lt: currentDate },
        })
        .populate('productId', 'productName stock')
        .populate('inventoryLogId', 'status action')
        .exec();

      if (expiredItems.length === 0) {
        this.logger.log('No expired products found');
        return {
          processedItems: [],
          totalExpiredItems: 0,
          totalQuantityRemoved: 0,
          summary: {},
        };
      }
      this.logger.log(
        `Found ${expiredItems.length} expired inventory log items`,
      );

      const processedItems: any[] = [];
      const summary: {
        [productId: string]: {
          productName: string;
          totalQuantityRemoved: number;
        };
      } = {};
      let totalQuantityRemoved = 0;

      const groupedByProduct = expiredItems.reduce((acc, item) => {
        let productId: string;
        let productName: string;
        let currentStock: number;

        if (typeof item.productId === 'string') {
          productId = item.productId;
          productName = 'Unknown Product';
          currentStock = 0;
        } else if (item.productId && typeof item.productId === 'object') {
          if ('_id' in item.productId) {
            productId = (item.productId as any)._id.toString();
            productName =
              (item.productId as any).productName || 'Unknown Product';
            currentStock = (item.productId as any).stock || 0;
          } else {
            productId = (item.productId as Types.ObjectId).toString();
            productName = 'Unknown Product';
            currentStock = 0;
          }
        } else {
          this.logger.warn(
            `Invalid product reference in expired item: ${item._id}`,
          );
          return acc;
        }

        const inventoryLog = item.inventoryLogId as any;
        if (
          inventoryLog?.status !== 'completed' ||
          inventoryLog?.action !== 'import'
        ) {
          this.logger.debug(
            `Skipping expired item ${item._id} - not from completed import`,
          );
          return acc;
        }

        if (!acc[productId]) {
          acc[productId] = {
            productId,
            productName,
            currentStock,
            items: [],
            totalExpiredQuantity: 0,
          };
        }

        acc[productId].items.push(item);
        acc[productId].totalExpiredQuantity += item.quantity;

        return acc;
      }, {});

      for (const [productId, productData] of Object.entries(groupedByProduct)) {
        const { productName, currentStock, totalExpiredQuantity, items } =
          productData as any;

        try {
          const quantityToRemove = Math.min(totalExpiredQuantity, currentStock);

          if (quantityToRemove > 0) {
            await this.productsService.decrementStock(
              productId,
              quantityToRemove,
            );

            const processedItem = {
              productId,
              productName,
              expiredQuantity: totalExpiredQuantity,
              quantityRemoved: quantityToRemove,
              currentStockBefore: currentStock,
              currentStockAfter: currentStock - quantityToRemove,
              expiredItems: items.map((item) => ({
                itemId: item._id,
                quantity: item.quantity,
                expirtyDate: item.expirtyDate,
                price: item.price,
                inventoryLogId: item.inventoryLogId,
              })),
            };

            processedItems.push(processedItem);
            totalQuantityRemoved += quantityToRemove;

            summary[productId] = {
              productName,
              totalQuantityRemoved: quantityToRemove,
            };

            this.logger.log(
              `Processed expired product ${productName} (${productId}): ` +
                `removed ${quantityToRemove}/${totalExpiredQuantity} expired units`,
            );

            if (quantityToRemove < totalExpiredQuantity) {
              this.logger.warn(
                `Could not remove all expired quantity for ${productName}: ` +
                  `tried to remove ${totalExpiredQuantity} but only ${quantityToRemove} available in stock`,
              );
            }
          } else {
            this.logger.warn(
              `Product ${productName} (${productId}) has expired items but no stock to remove`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing expired product ${productId}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Expired products processing completed: ` +
          `${processedItems.length} products processed, ` +
          `${totalQuantityRemoved} total quantity removed`,
      );

      return {
        processedItems,
        totalExpiredItems: expiredItems.length,
        totalQuantityRemoved,
        summary,
      };
    } catch (error) {
      this.logger.error(`Error processing expired products: ${error.message}`);
      throw new BadRequestException(
        `Failed to process expired products: ${error.message}`,
      );
    }
  }

  async getExpiredProducts(checkDate?: Date) {
    try {
      const currentDate = checkDate || new Date();

      const expiredItems = await this.inventoryLogItemsModel
        .find({
          expirtyDate: { $lt: currentDate },
        })
        .populate('productId', 'productName stock')
        .populate('inventoryLogId', 'status action batch')
        .sort({ expirtyDate: 1 })
        .exec();

      return expiredItems.map((item) => {
        let productInfo = { productName: 'Unknown Product', stock: 0 };

        if (
          item.productId &&
          typeof item.productId === 'object' &&
          '_id' in item.productId
        ) {
          productInfo = {
            productName:
              (item.productId as any).productName || 'Unknown Product',
            stock: (item.productId as any).stock || 0,
          };
        }

        const inventoryLogInfo = item.inventoryLogId as any;

        return {
          itemId: item._id,
          productId:
            typeof item.productId === 'string'
              ? item.productId
              : (item.productId as any)?._id,
          productName: productInfo.productName,
          quantity: item.quantity,
          expirtyDate: item.expirtyDate,
          price: item.price,
          daysPastExpiry: Math.floor(
            (currentDate.getTime() - item.expirtyDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          inventoryLogInfo: {
            id: inventoryLogInfo?._id,
            batch: inventoryLogInfo?.batch,
            status: inventoryLogInfo?.status,
            action: inventoryLogInfo?.action,
          },
          currentStock: productInfo.stock,
        };
      });
    } catch (error) {
      this.logger.error(`Error getting expired products: ${error.message}`);
      throw new BadRequestException(
        `Failed to get expired products: ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processExpiredProductsAutomatically(): Promise<void> {
    this.logger.log('Starting automatic expired products processing...');

    try {
      const result = await this.processExpiredProducts();

      if (result.totalExpiredItems === 0) {
        this.logger.log(
          'Automatic processing completed: No expired products found',
        );
        return;
      }

      const message =
        `Automatic expired products processing completed: ` +
        `${result.totalExpiredItems} expired items found, ` +
        `${result.totalQuantityRemoved} units removed from ${result.processedItems.length} products`;

      this.logger.log(message);

      if (Object.keys(result.summary).length > 0) {
        this.logger.log('Processed products summary:');
        Object.entries(result.summary).forEach(([productId, info]) => {
          this.logger.log(
            `  - ${info.productName}: ${info.totalQuantityRemoved} units removed`,
          );
        });
      }
    } catch (error) {
      this.logger.error(
        `Automatic expired products processing failed: ${error.message}`,
      );
    }
  }

  async triggerManualExpiredProductsProcessing(): Promise<{
    success: boolean;
    message: string;
    result?: any;
  }> {
    this.logger.log('Manual trigger of expired products processing requested');

    try {
      const result = await this.processExpiredProducts();

      const message =
        `Manual processing completed: ` +
        `${result.totalExpiredItems} expired items found, ` +
        `${result.totalQuantityRemoved} units removed from ${result.processedItems.length} products`;

      return {
        success: true,
        message,
        result,
      };
    } catch (error) {
      this.logger.error(
        `Manual expired products processing failed: ${error.message}`,
      );
      return {
        success: false,
        message: `Processing failed: ${error.message}`,
      };
    }
  }
}
