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
  private async generateBatchNumber(productId: string): Promise<string> {
    try {
      const product = await this.productsService.findOne(productId);

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

      const productPrefix = product.productName
        .replace(/[^A-Za-z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase()
        .padEnd(4, '0');

      const todayPrefix = `${productPrefix}-${dateStr}`;
      const existingBatches = await this.inventoryLogItemsModel
        .find({
          productId: new Types.ObjectId(productId),
          batch: { $regex: `^${todayPrefix}-` },
        })
        .sort({ createdAt: -1 })
        .limit(1);

      let sequence = 1;
      if (existingBatches.length > 0) {
        const lastBatch = existingBatches[0].batch;
        const lastSequence = parseInt(lastBatch.split('-').pop() || '0');
        sequence = lastSequence + 1;
      }

      // Format: PREFIX-YYYYMMDD-XXX
      const batchNumber = `${todayPrefix}-${sequence.toString().padStart(3, '0')}`;

      this.logger.debug(
        `Generated batch number: ${batchNumber} for product ${productId}`,
      );
      return batchNumber;
    } catch (error) {
      this.logger.error(`Error generating batch number: ${error.message}`);
      throw new BadRequestException(
        `Failed to generate batch number: ${error.message}`,
      );
    }
  }

  async create(
    createInventoryLogDto: CreateInventoryLogDto,
  ): Promise<InventoryLogDocument> {
    try {
      for (const product of createInventoryLogDto.products) {
        await this.productsService.findOne(product.productId);
      }

      const newInventoryLog = new this.inventoryLogModel({
        action: createInventoryLogDto.action,
        status: 'pending',
        userId: new Types.ObjectId(createInventoryLogDto.userId),
      });

      const savedInventoryLog = await newInventoryLog.save();

      const inventoryLogItems = await Promise.all(
        createInventoryLogDto.products.map(async (product) => {
          let batchNumber = product.batch;

          if (createInventoryLogDto.action === 'import' && !product.batch) {
            batchNumber = await this.generateBatchNumber(product.productId);
          }

          return {
            inventoryLogId: savedInventoryLog._id,
            productId: new Types.ObjectId(product.productId),
            quantity: product.quantity,
            expiryDate: new Date(product.expiryDate),
            price: product.price,
            batch: batchNumber,
            stock: product.quantity,
          };
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
          const inventoryLogItemsWithBatch =
            await this.inventoryLogItemsModel.find({
              batch: { $regex: filterDto.batch, $options: 'i' },
            });
          const inventoryLogIdsFromBatch = inventoryLogItemsWithBatch.map(
            (item) => item.inventoryLogId,
          );

          if (query._id && query._id.$in) {
            query._id = {
              $in: query._id.$in.filter((id) =>
                inventoryLogIdsFromBatch.some((batchId) => batchId.equals(id)),
              ),
            };
          } else {
            query._id = { $in: inventoryLogIdsFromBatch };
          }
        }
      }

      const logs = await this.inventoryLogModel
        .find(query)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .exec();

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
      const inventoryLog = await this.inventoryLogModel
        .findById(id)
        .populate('userId', 'fullName email')
        .exec();

      if (!inventoryLog) {
        throw new NotFoundException(`Inventory log with ID ${id} not found`);
      }

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

      const inventoryLogItems = await this.inventoryLogItemsModel
        .find({
          inventoryLogId: inventoryLog._id,
        })
        .populate('productId', 'productName price')
        .exec();

      for (const item of inventoryLogItems) {
        let productId: string;

        if (typeof item.productId === 'string') {
          productId = item.productId;
        } else if (item.productId && typeof item.productId === 'object') {
          if ('_id' in item.productId) {
            productId = (item.productId as any)._id.toString();
          } else if (Types.ObjectId.isValid(item.productId)) {
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
            await this.syncProductStock(productId);
          } else if (action === 'export') {
            if (item.batch && item.batch.trim() !== '') {
              await this.reduceStockFromSpecificBatch(
                productId,
                item.batch,
                quantity,
              );
            } else {
              await this.reduceStockFIFO(productId, quantity);
            }
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

  async getInventoryLogItemsByProduct(productId: string) {
    return this.inventoryLogItemsModel
      .find({
        productId: new Types.ObjectId(productId),
      })
      .populate('productId', 'productName price stock')
      .populate('inventoryLogId', 'action status createdAt')
      .sort({ expiryDate: 1 })
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
          expiryDate: { $lt: currentDate },
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
        let productStock: number;

        if (typeof item.productId === 'string') {
          productId = item.productId;
          productName = 'Unknown Product';
          productStock = 0;
        } else if (item.productId && typeof item.productId === 'object') {
          if ('_id' in item.productId) {
            productId = (item.productId as any)._id.toString();
            productName =
              (item.productId as any).productName || 'Unknown Product';
            productStock = (item.productId as any).stock || 0;
          } else {
            productId = (item.productId as Types.ObjectId).toString();
            productName = 'Unknown Product';
            productStock = 0;
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
            currentStock: productStock,
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
            const fifoResult = await this.reduceStockFIFO(
              productId,
              quantityToRemove,
            );

            const processedItem = {
              productId,
              productName,
              expiredQuantity: totalExpiredQuantity,
              quantityRemoved: fifoResult.totalReduced,
              stockBefore: currentStock,
              stockAfter: currentStock - fifoResult.totalReduced,
              reducedBatches: fifoResult.reducedBatches,
              expiredItems: items.map((item) => ({
                itemId: item._id,
                quantity: item.quantity,
                expiryDate: item.expiryDate,
                price: item.price,
                inventoryLogId: item.inventoryLogId,
              })),
            };

            processedItems.push(processedItem);
            totalQuantityRemoved += fifoResult.totalReduced;

            summary[productId] = {
              productName,
              totalQuantityRemoved: fifoResult.totalReduced,
            };

            this.logger.log(
              `Processed expired product ${productName} (${productId}): ` +
                `removed ${fifoResult.totalReduced}/${totalExpiredQuantity} expired units via FIFO`,
            );

            if (fifoResult.totalReduced < totalExpiredQuantity) {
              this.logger.warn(
                `Could not remove all expired quantity for ${productName}: ` +
                  `tried to remove ${totalExpiredQuantity} but only ${fifoResult.totalReduced} available in batches`,
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
          expiryDate: { $lt: currentDate },
        })
        .populate('productId', 'productName stock')
        .populate('inventoryLogId', 'status action')
        .sort({ expiryDate: 1 })
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
          expiryDate: item.expiryDate,
          price: item.price,
          daysPastExpiry: Math.floor(
            (currentDate.getTime() - item.expiryDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          inventoryLogInfo: {
            id: inventoryLogInfo?._id,
            status: inventoryLogInfo?.status,
            action: inventoryLogInfo?.action,
          },
          stock: productInfo.stock,
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

  async syncProductStock(productId: string): Promise<void> {
    try {
      const batchStockTotal = await this.inventoryLogItemsModel.aggregate([
        {
          $match: {
            productId: new Types.ObjectId(productId),
            stock: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            totalStock: { $sum: '$stock' },
          },
        },
      ]);

      const totalStock = batchStockTotal[0]?.totalStock || 0;

      await this.productsService.update(productId, { stock: totalStock });

      this.logger.debug(
        `Synchronized product ${productId} stock: ${totalStock}`,
      );
    } catch (error) {
      this.logger.error(
        `Error syncing product stock for ${productId}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateBatchStock(
    inventoryLogItemId: string,
    quantityChange: number,
  ): Promise<void> {
    try {
      const item = await this.inventoryLogItemsModel.findByIdAndUpdate(
        inventoryLogItemId,
        { $inc: { stock: quantityChange } },
        { new: true },
      );

      if (!item) {
        throw new NotFoundException(
          `Inventory log item ${inventoryLogItemId} not found`,
        );
      }

      if (item.stock < 0) {
        await this.inventoryLogItemsModel.findByIdAndUpdate(
          inventoryLogItemId,
          { stock: 0 },
        );
        item.stock = 0;
      }

      await this.syncProductStock(item.productId.toString());

      this.logger.debug(
        `Updated batch stock for item ${inventoryLogItemId}: ${quantityChange}`,
      );
    } catch (error) {
      this.logger.error(`Error updating batch stock: ${error.message}`);
      throw error;
    }
  }

  async getProductStockByBatches(productId: string): Promise<{
    totalStock: number;
    batches: Array<{
      itemId: string;
      batchNumber: string;
      stock: number;
      expiryDate: Date;
      price: number;
      daysUntilExpiry: number;
    }>;
  }> {
    try {
      const batches = await this.inventoryLogItemsModel
        .find({
          productId: new Types.ObjectId(productId),
          stock: { $gt: 0 },
        })
        .populate('inventoryLogId', 'batch action createdAt')
        .sort({ expiryDate: 1 })
        .exec();

      const currentDate = new Date();
      const batchDetails = batches.map((batch) => ({
        itemId: batch._id.toString(),
        batchNumber: batch.batch,
        stock: batch.stock,
        expiryDate: batch.expiryDate,
        price: batch.price,
        daysUntilExpiry: Math.ceil(
          (batch.expiryDate.getTime() - currentDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        inventoryLogInfo: batch.inventoryLogId,
      }));

      const totalStock = batchDetails.reduce(
        (sum, batch) => sum + batch.stock,
        0,
      );

      return {
        totalStock,
        batches: batchDetails,
      };
    } catch (error) {
      this.logger.error(
        `Error getting product stock by batches: ${error.message}`,
      );
      throw error;
    }
  }

  async reduceStockFIFO(
    productId: string,
    quantityToReduce: number,
  ): Promise<{
    success: boolean;
    reducedBatches: Array<{
      batchNumber: string;
      reducedQuantity: number;
      remainingInBatch: number;
    }>;
    totalReduced: number;
    shortfall: number;
  }> {
    try {
      const availableBatches = await this.inventoryLogItemsModel
        .find({
          productId: new Types.ObjectId(productId),
          stock: { $gt: 0 },
        })
        .sort({ expiryDate: 1 })
        .exec();

      let remainingQuantity = quantityToReduce;
      const reducedBatches: Array<{
        batchNumber: string;
        reducedQuantity: number;
        remainingInBatch: number;
      }> = [];
      let totalReduced = 0;

      for (const batch of availableBatches) {
        if (remainingQuantity <= 0) break;

        const reductionAmount = Math.min(batch.stock, remainingQuantity);

        // Update batch stock
        await this.inventoryLogItemsModel.findByIdAndUpdate(batch._id, {
          $inc: { stock: -reductionAmount },
        });

        reducedBatches.push({
          batchNumber: batch.batch,
          reducedQuantity: reductionAmount,
          remainingInBatch: batch.stock - reductionAmount,
        });

        remainingQuantity -= reductionAmount;
        totalReduced += reductionAmount;
      }

      // Sync product total stock
      await this.syncProductStock(productId);

      return {
        success: remainingQuantity === 0,
        reducedBatches,
        totalReduced,
        shortfall: remainingQuantity,
      };
    } catch (error) {
      this.logger.error(`Error reducing stock FIFO: ${error.message}`);
      throw error;
    }
  }

  async reduceStockFromSpecificBatch(
    productId: string,
    batchNumber: string,
    quantityToReduce: number,
  ): Promise<{
    success: boolean;
    reducedQuantity: number;
    remainingInBatch: number;
    shortfall: number;
  }> {
    try {
      const batchItem = await this.inventoryLogItemsModel.findOne({
        productId: new Types.ObjectId(productId),
        batch: batchNumber,
        stock: { $gt: 0 },
      });

      if (!batchItem) {
        throw new NotFoundException(
          `Batch ${batchNumber} not found or has no stock for product ${productId}`,
        );
      }

      const availableStock = batchItem.stock;
      const reductionAmount = Math.min(availableStock, quantityToReduce);
      const shortfall = quantityToReduce - reductionAmount;

      // Update batch stock
      await this.inventoryLogItemsModel.findByIdAndUpdate(batchItem._id, {
        $inc: { stock: -reductionAmount },
      });

      // Sync product total stock
      await this.syncProductStock(productId);

      this.logger.debug(
        `Reduced ${reductionAmount} units from batch ${batchNumber} for product ${productId}`,
      );

      return {
        success: shortfall === 0,
        reducedQuantity: reductionAmount,
        remainingInBatch: availableStock - reductionAmount,
        shortfall,
      };
    } catch (error) {
      this.logger.error(
        `Error reducing stock from specific batch: ${error.message}`,
      );
      throw error;
    }
  }
}
