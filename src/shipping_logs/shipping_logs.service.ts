import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShippingLog, ShippingStatus } from './entities/shipping_log.entity';
import { CreateShippingLogDto } from './dto/create-shipping-log.dto';
import { UpdateShippingLogDto } from './dto/update-shipping-log.dto';
import { Orders, Order_Items } from '../orders/entities/order.entity';
import { Product } from '../products/schemas/product.schema';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ShippingLogsService {
  private readonly logger = new Logger(ShippingLogsService.name);

  constructor(
    @InjectModel(ShippingLog.name)
    private readonly shippingLogModel: Model<ShippingLog>,
    @InjectModel(Orders.name)
    private readonly ordersModel: Model<Orders>,
    @InjectModel(Order_Items.name)
    private readonly orderItemsModel: Model<Order_Items>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  async create(
    createShippingLogDto: CreateShippingLogDto,
  ): Promise<ShippingLog> {
    this.logger.log('Creating shipping log');
    const newShippingLog = new this.shippingLogModel(createShippingLogDto);
    return newShippingLog.save();
  }

  async createFromApprovedOrder(
    orderId: string,
    totalAmount: number,
  ): Promise<ShippingLog> {
    this.logger.log(`Creating shipping log for approved order ${orderId}`);

    const newShippingLog = new this.shippingLogModel({
      orderId: new Types.ObjectId(orderId),
      status: ShippingStatus.PENDING,
      totalAmount,
    });

    return newShippingLog.save();
  }

  async findAll(): Promise<ShippingLog[]> {
    return this.shippingLogModel
      .find()
      .populate({
        path: 'orderId',
        model: Orders.name,
        populate: [
          {
            path: 'userId',
            model: User.name,
            select: 'name email phone address',
          },
          {
            path: 'transactionId',
            model: Transaction.name,
          },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: number): Promise<any> {
    const shippingLog = await this.shippingLogModel
      .findById(id)
      .populate({
        path: 'orderId',
        model: Orders.name,
        populate: [
          {
            path: 'userId',
            model: User.name,
            select: 'name email phone address',
          },
          {
            path: 'transactionId',
            model: Transaction.name,
          },
        ],
      })
      .exec();

    if (!shippingLog) {
      throw new NotFoundException(`Shipping log with ID ${id} not found`);
    }

    // Get the order items for the order
    const orderDoc = shippingLog.orderId as any; // Cast to any to access _id
    const orderItems = await this.getOrderItemsWithProductDetails(orderDoc._id);

    // Create a combined response with shipping log, order details, and order items
    const result = shippingLog.toObject();
    // Ensure orderId is treated as a proper object
    result.orderId = {
      ...(orderDoc.toObject ? orderDoc.toObject() : orderDoc),
      items: orderItems,
    };

    return result;
  }

  async findByOrderId(orderId: string): Promise<any> {
    const shippingLog = await this.shippingLogModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .populate({
        path: 'orderId',
        model: Orders.name,
        populate: [
          {
            path: 'userId',
            model: User.name,
            select: 'name email phone address',
          },
          {
            path: 'transactionId',
            model: Transaction.name,
          },
        ],
      })
      .exec();

    if (!shippingLog) {
      throw new NotFoundException(
        `Shipping log for order ${orderId} not found`,
      );
    }

    // Get the order items for the order
    const orderItems = await this.getOrderItemsWithProductDetails(orderId);

    // Create a combined response with shipping log, order details, and order items
    const result = shippingLog.toObject();
    const orderDoc = result.orderId as any; // Cast to any to avoid TypeScript errors

    // Assign the populated order with items to the result
    result.orderId = {
      ...(orderDoc || {}), // Use empty object as fallback
      items: orderItems,
    };

    return result;
  }

  /**
   * Get order items with product details - now exposed as public method for controller use
   */
  async getOrderItemsWithProductDetails(orderId: any): Promise<any[]> {
    const orderIdObj =
      typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

    try {
      // First, try to get items with direct fields (productName, productImage) from order_items
      const orderItems = await this.orderItemsModel
        .find({ orderId: orderIdObj })
        .populate({
          path: 'productId',
          model: 'Product',
          select: 'productName productImages description price category brand',
        })
        .exec();

      return orderItems.map((item) => {
        const itemObj = item.toObject ? item.toObject() : item;

        // Safe handling for productId - it could be an ObjectId or a populated Product object
        let productName = itemObj.productName || '';
        let productImage = itemObj.productImage || '';
        let brand = '';
        let description = '';
        let category = '';
        let productPrice = itemObj.price || 0;
        let productId = itemObj.productId;

        // If productId is a populated object, extract properties safely
        if (itemObj.productId && typeof itemObj.productId === 'object') {
          const product = itemObj.productId as Record<string, any>; // Use record to safely access properties
          productName = productName || product.productName || '';
          productPrice = itemObj.price || product.price || 0;

          if (
            product.productImages &&
            Array.isArray(product.productImages) &&
            product.productImages.length > 0
          ) {
            productImage = productImage || product.productImages[0];
          }

          brand = product.brand || '';
          description = product.description || '';
          category = product.category || '';
          productId = product._id || itemObj.productId;
        }

        // Prepare comprehensive product details
        return {
          id: itemObj._id,
          productId: productId,
          productName: productName || 'Unknown Product',
          quantity: itemObj.quantity || 0,
          price: productPrice,
          subtotal: productPrice * (itemObj.quantity || 0),
          productImage: productImage,
          brand: brand,
          description: description,
          category: category,
        };
      });
    } catch (error) {
      this.logger.error(`Error fetching order items: ${error.message}`);
      return [];
    }
  }

  async update(
    id: number,
    updateShippingLogDto: UpdateShippingLogDto,
  ): Promise<ShippingLog> {
    const updatedLog = await this.shippingLogModel
      .findByIdAndUpdate(id, updateShippingLogDto, { new: true })
      .exec();

    if (!updatedLog) {
      throw new NotFoundException(`Shipping log with ID ${id} not found`);
    }

    return updatedLog;
  }

  async updateStatus(id: string, status: ShippingStatus): Promise<ShippingLog> {
    const shippingLog = await this.shippingLogModel.findById(id);

    console.log(`Updating shipping log ${id} status to ${status}`);

    if (!shippingLog) {
      throw new NotFoundException(`Shipping log ${id} not found`);
    }

    shippingLog.status = status;
    return shippingLog.save();
  }

  async remove(id: number): Promise<ShippingLog> {
    const deletedLog = await this.shippingLogModel.findByIdAndDelete(id).exec();

    if (!deletedLog) {
      throw new NotFoundException(`Shipping log with ID ${id} not found`);
    }

    return deletedLog;
  }
}
