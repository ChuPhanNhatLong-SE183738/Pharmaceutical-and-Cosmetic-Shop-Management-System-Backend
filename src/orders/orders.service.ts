import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ModuleRef } from '@nestjs/core';
import {
  Orders,
  OrdersDocument,
  Order_Items,
  Order_ItemsDocument,
} from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ShippingLogsService } from '../shipping_logs/shipping_logs.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private shippingLogsService: ShippingLogsService;

  constructor(
    @InjectModel(Orders.name) private ordersModel: Model<OrdersDocument>,
    @InjectModel(Order_Items.name)
    private orderItemsModel: Model<Order_ItemsDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly cartService: CartService,
    private readonly usersService: UsersService,
    private readonly moduleRef: ModuleRef,
  ) {
    // We'll resolve the ShippingLogsService after initialization to avoid circular dependencies
    setTimeout(() => {
      this.shippingLogsService = this.moduleRef.get(ShippingLogsService, { strict: false });
    }, 0);
  }

  async createOrder(createOrderDto: CreateOrderDto) {
    const newOrder = new this.ordersModel({
      userId: createOrderDto.userId,
      transactionId: createOrderDto.transactionId,
      status: createOrderDto.status,
    });
    const savedOrder = await newOrder.save();

    const orderItems = createOrderDto.orderItems.map((item) => ({
      orderId: savedOrder._id,
      productId: item.productId,
      quantity: item.quantity,
    }));

    await this.orderItemsModel.insertMany(orderItems);

    return this.findOne(
      savedOrder._id instanceof Types.ObjectId
        ? savedOrder._id.toString()
        : String(savedOrder._id),
    );
  }

  async createOrderFromCart(data: {
    userId: string;
    cartId: string;
    transactionId: string;
    status: string;
  }) {
    this.logger.debug('Creating order from cart:', data);

    try {
      const cart = await this.cartService.findOne(data.cartId);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${data.cartId} not found`);
      }

      // Get populated cart with product details
      const populatedCart = await this.cartService.findOneWithPopulatedItems(
        data.cartId,
      );
      if (!populatedCart) {
        throw new Error('Failed to get cart items with product details');
      }

      this.logger.debug('Cart found:', JSON.stringify(populatedCart, null, 2));

      const user = await this.usersService.findById(data.userId);

      // Calculate total from all items
      const totalAmount = populatedCart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // Create the order first
      const newOrder = new this.ordersModel({
        userId: new Types.ObjectId(data.userId),
        transactionId: new Types.ObjectId(data.transactionId),
        status: data.status,
        totalAmount: totalAmount,
        shippingAddress: user?.address || '',
        contactPhone: user?.phone || '',
      });

      const savedOrder = await newOrder.save();
      this.logger.debug('Order created:', JSON.stringify(savedOrder, null, 2));

      // Create order items for each cart item
      if (populatedCart.items && populatedCart.items.length > 0) {
        const orderItemsData = populatedCart.items.map((item) => {
          const product = item.productId as any;

          this.logger.debug(
            'Processing product:',
            JSON.stringify(product, null, 2),
          );

          if (!product || (!product.id && !product._id)) {
            this.logger.warn('Missing product ID in cart item');
            return null;
          }

          // Extract product data safely with proper field names
          const productData = {
            id: product.id || product._id,
            name: product.productName, // Primary field
            image: product.productImages?.[0] || product.image || '', // Try productImages first
            price: item.price || product.price || 0,
          };

          if (!productData.name) {
            this.logger.warn(
              `No product name found for product ID ${productData.id}, full product:`,
              product,
            );
            // Try to fetch product directly if name is missing
            return this.productModel
              .findById(productData.id)
              .then((fullProduct) => {
                if (!fullProduct) return null;
                return {
                  orderId: savedOrder._id,
                  productId: new Types.ObjectId(productData.id),
                  quantity: item.quantity,
                  price: productData.price,
                  productName: fullProduct.productName,
                  productImage:
                    fullProduct.productImages?.[0] || fullProduct.image || '',
                };
              })
              .catch((err) => {
                this.logger.error(
                  `Error fetching product details: ${err.message}`,
                );
                return null;
              });
          }

          return {
            orderId: savedOrder._id,
            productId: new Types.ObjectId(productData.id),
            quantity: item.quantity,
            price: productData.price,
            productName: productData.name,
            productImage: productData.image,
          };
        });

        // Handle potential promises from product fetching
        const resolvedOrderItems = await Promise.all(orderItemsData);
        const validOrderItems = resolvedOrderItems.filter(
          (item) => item !== null,
        );

        if (validOrderItems.length > 0) {
          this.logger.debug(
            'Creating order items:',
            JSON.stringify(validOrderItems, null, 2),
          );
          await this.orderItemsModel.insertMany(validOrderItems);
          this.logger.debug(`Created ${validOrderItems.length} order items`);
        }
      }

      // Clear the cart
      try {
        const userObjectId = new Types.ObjectId(data.userId);
        await this.cartService.clearCart(userObjectId);
        this.logger.debug('Cart cleared successfully');
      } catch (cartError) {
        this.logger.error(
          `Failed to clear cart: ${cartError.message}`,
          cartError.stack,
        );
      }

      // Return the complete order with items
      const orderId = savedOrder._id as Types.ObjectId;
      return this.findOne(orderId.toString());
    } catch (error) {
      this.logger.error(
        `Error creating order from cart: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll() {
    try {
      const orders = await this.ordersModel
        .find()
        .populate('userId', 'name email phone address')
        .populate('transactionId')
        .sort({ createdAt: -1 })
        .exec();

      return orders;
    } catch (error) {
      this.logger.error(
        `Error finding all orders: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAllByStatus(status: string) {
    try {
      const orders = await this.ordersModel
        .find({ status })
        .populate({
          path: 'userId',
          model: User.name,
          select: 'name email phone address',
        })
        .populate({
          path: 'transactionId',
          model: Transaction.name, // Use Transaction.name here
        })
        .sort({ createdAt: -1 })
        .exec();

      // Get items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const orderId =
            order._id instanceof Types.ObjectId
              ? order._id.toString()
              : String(order._id);
          const items = await this.findOne(orderId);
          return items;
        }),
      );

      return ordersWithItems;
    } catch (error) {
      this.logger.error(`Error finding orders by status: ${error.message}`);
      throw error;
    }
  }

  async processOrder(
    id: string,
    data: {
      status: 'approved' | 'rejected';
      note?: string;
      rejectionReason?: string;
      processedBy: string;
    },
  ) {
    try {
      const order = await this.ordersModel.findById(id);
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      // Update order status
      order.status = data.status;

      // Save note if provided
      if (data.note) {
        order.notes = data.note;
      }

      // Save rejection reason if applicable
      if (data.status === 'rejected' && data.rejectionReason) {
        order.set('rejectionReason', data.rejectionReason);
      }

      // Save processor information
      if (data.processedBy) {
        order.set('processedBy', new Types.ObjectId(data.processedBy));
      }

      const updatedOrder = await order.save();
      this.logger.debug(`Order ${id} has been ${data.status} by ${data.processedBy}`);

      // Create shipping log if order is approved
      if (data.status === 'approved') {
        try {
          // Make sure shippingLogsService is initialized
          if (!this.shippingLogsService) {
            this.shippingLogsService = this.moduleRef.get(ShippingLogsService, { strict: false });
          }
          
          const createdLog = await this.shippingLogsService.createFromApprovedOrder(
            id, 
            order.totalAmount
          );
          
          this.logger.debug(`Created shipping log for order ${id}: ${createdLog._id}`);
        } catch (error) {
          this.logger.error(`Failed to create shipping log: ${error.message}`, error.stack);
          // Continue execution even if shipping log creation fails
        }
      }

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error processing order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const order = await this.ordersModel
        .findById(id)
        .populate({
          path: 'userId',
          model: User.name, // Use User.name instead of 'Users'
          select: 'name email phone address',
        })
        .populate({
          path: 'transactionId',
          model: Transaction.name, // Use Transaction.name instead of 'Transactions'
        })
        .exec();

      if (!order) {
        this.logger.warn(`Order with ID ${id} not found`);
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      const orderItems = await this.orderItemsModel
        .find({ orderId: new Types.ObjectId(id) })
        .populate('productId', 'productName image price')
        .exec();

      const orderWithItems = {
        ...order.toObject(),
        items: orderItems.map((item) => ({
          id: item._id,
          orderId: item.orderId,
          productId: item.productId._id,
          productDetails: item.productId,
          quantity: item.quantity,
          price: item.price,
          productName: item.productName,
          productImage: item.productImage,
          subtotal: item.price * item.quantity,
        })),
        itemCount: orderItems.length,
        totalQuantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      };

      return orderWithItems;
    } catch (error) {
      this.logger.error(`Error finding order with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async updateOrderStatus(id: string, status: string) {
    try {
      const order = await this.ordersModel.findById(id);
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      order.status = status;
      await order.save();

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error updating order status: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    try {
      const updatedOrder = await this.ordersModel
        .findByIdAndUpdate(id, updateOrderDto, { new: true })
        .exec();

      if (!updatedOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error updating order: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.orderItemsModel.deleteMany({
        orderId: new Types.ObjectId(id),
      });
      const deletedOrder = await this.ordersModel.findByIdAndDelete(id).exec();

      if (!deletedOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return deletedOrder;
    } catch (error) {
      this.logger.error(`Error removing order: ${error.message}`);
      throw error;
    }
  }

  async findOrdersByUserId(userId: string) {
    try {
      const orders = await this.ordersModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate('userId', 'name email phone address')
        .populate('transactionId')
        .sort({ createdAt: -1 })
        .exec();

      // Get items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const orderId =
            order._id instanceof Types.ObjectId
              ? order._id.toString()
              : String(order._id);
          const items = await this.findOne(orderId);
          return items;
        }),
      );

      return ordersWithItems;
    } catch (error) {
      this.logger.error(`Error finding orders by user ID: ${error.message}`);
      throw error;
    }
  }
}
