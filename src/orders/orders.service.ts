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
import { InventoryLogsService } from '../inventory_logs/inventory_logs.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private shippingLogsService: ShippingLogsService;
  private inventoryLogsService: InventoryLogsService;

  constructor(
    @InjectModel(Orders.name) private ordersModel: Model<OrdersDocument>,
    @InjectModel(Order_Items.name)
    private orderItemsModel: Model<Order_ItemsDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly cartService: CartService,
    private readonly usersService: UsersService,
    private readonly moduleRef: ModuleRef,
  ) {
    setTimeout(() => {
      this.shippingLogsService = this.moduleRef.get(ShippingLogsService, {
        strict: false,
      });
      this.inventoryLogsService = this.moduleRef.get(InventoryLogsService, {
        strict: false,
      });
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

      // // Clear the cart
      // try {
      //   const userObjectId = new Types.ObjectId(data.userId);
      //   await this.cartService.clearCart(userObjectId);
      //   this.logger.debug('Cart cleared successfully');
      // } catch (cartError) {
      //   this.logger.error(
      //     `Failed to clear cart: ${cartError.message}`,
      //     cartError.stack,
      //   );
      // }

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
      this.logger.debug(
        `Order ${id} has been ${data.status} by ${data.processedBy}`,
      );

      // Create shipping log if order is approved
      if (data.status === 'approved') {
        try {
          // Make sure shippingLogsService is initialized
          if (!this.shippingLogsService) {
            this.shippingLogsService = this.moduleRef.get(ShippingLogsService, {
              strict: false,
            });
          }

          const createdLog =
            await this.shippingLogsService.createFromApprovedOrder(
              id,
              order.totalAmount,
            );

          this.logger.debug(
            `Created shipping log for order ${id}: ${createdLog._id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create shipping log: ${error.message}`,
            error.stack,
          );
        }

        try {
          if (!this.inventoryLogsService) {
            this.inventoryLogsService = this.moduleRef.get(InventoryLogsService, {
              strict: false,
            });
          }

          const orderItems = await this.orderItemsModel
            .find({ orderId: new Types.ObjectId(id) })
            .exec();

          this.logger.debug(`Found ${orderItems.length} items in order ${id} to reduce stock for`);

          for (const item of orderItems) {
            try {
              const productId = item.productId.toString();
              const quantity = item.quantity;

              this.logger.debug(`Reducing stock for product ${productId} by ${quantity} units`);

              const reductionResult = await this.inventoryLogsService.reduceStockFIFO(
                productId,
                quantity,
              );

              if (reductionResult.success) {
                this.logger.log(
                  `Successfully reduced stock for product ${productId} by ${reductionResult.totalReduced} units`,
                );
              } else {
                this.logger.warn(
                  `Partial stock reduction for product ${productId}: reduced ${reductionResult.totalReduced}/${quantity}, shortfall: ${reductionResult.shortfall}`,
                );
              }
            } catch (stockError) {
              this.logger.error(
                `Failed to reduce stock for item ${item._id}: ${stockError.message}`,
                stockError.stack,
              );
            }
          }

          this.logger.log(`Stock reduction completed for order ${id}`);
        } catch (error) {
          this.logger.error(
            `Failed to reduce stock for order ${id}: ${error.message}`,
            error.stack,
          );
        }
      }

      return this.findOne(id);
    } catch (error) {
      this.logger.error(
        `Error processing order: ${error.message}`,
        error.stack,
      );
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

  async refundOrder(
    id: string,
    data: {
      refundReason?: string;
      note?: string;
      processedBy: string;
    },
  ) {
    try {
      const order = await this.ordersModel.findById(id);
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      // Validate that order can only be refunded if it was previously rejected
      if (order.status !== 'rejected') {
        throw new ConflictException(
          `Order can only be refunded if it was previously rejected. Current status: ${order.status}`,
        );
      }

      // Update order status to refunded
      order.status = 'refunded';

      // Save refund reason if provided
      if (data.refundReason) {
        order.set('refundReason', data.refundReason);
      }

      // Update or append to notes
      if (data.note) {
        const existingNotes = order.notes || '';
        const refundNote = `[REFUND] ${data.note}`;
        order.notes = existingNotes
          ? `${existingNotes}\n${refundNote}`
          : refundNote;
      }

      // Update processor information
      if (data.processedBy) {
        order.set('processedBy', new Types.ObjectId(data.processedBy));
      }

      const updatedOrder = await order.save();
      this.logger.debug(`Order ${id} has been refunded by ${data.processedBy}`);

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error refunding order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createOrderFromSelectedCartItems(data: {
    userId: string;
    cartId: string;
    transactionId: string;
    status: string;
    selectedProductIds: string[];
  }) {
    this.logger.debug('Creating order from selected cart items:', data);

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

      // Filter cart items based on selected product IDs - Fix the comparison logic
      const selectedItems = populatedCart.items.filter((item) => {
        // Handle different possible formats of productId
        let productId: string;

        if (typeof item.productId === 'string') {
          productId = item.productId;
        } else if (item.productId instanceof Types.ObjectId) {
          productId = item.productId.toString();
        } else if (item.productId && typeof item.productId === 'object') {
          // This is a populated product object
          productId =
            (item.productId as any).id ||
            (item.productId as any)._id?.toString() ||
            item.productId.toString();
        } else {
          productId = String(item.productId);
        }

        this.logger.debug(
          `Checking product ${productId} against selected IDs:`,
          data.selectedProductIds,
        );

        return data.selectedProductIds.includes(productId);
      });

      this.logger.debug(
        `Found ${selectedItems.length} selected items out of ${populatedCart.items.length} total items`,
      );

      if (selectedItems.length === 0) {
        this.logger.error(
          'No valid selected items found. Selected IDs:',
          data.selectedProductIds,
        );
        this.logger.error(
          'Available product IDs in cart:',
          populatedCart.items.map((item) => {
            if (typeof item.productId === 'string') {
              return item.productId;
            } else if (item.productId instanceof Types.ObjectId) {
              return item.productId.toString();
            } else if (item.productId && typeof item.productId === 'object') {
              return (
                (item.productId as any).id ||
                (item.productId as any)._id?.toString() ||
                item.productId.toString()
              );
            } else {
              return String(item.productId);
            }
          }),
        );
        throw new Error('No valid selected items found in cart');
      }

      // Calculate total from selected items only
      const totalAmount = selectedItems.reduce(
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

      // Create order items for selected cart items only
      if (selectedItems.length > 0) {
        const orderItemsData = selectedItems.map((item) => {
          const product = item.productId as any;

          this.logger.debug(
            'Processing selected product:',
            JSON.stringify(product, null, 2),
          );

          // Extract product data safely with proper field names
          let productData: {
            id: string;
            name: string;
            image: string;
            price: number;
          };

          if (typeof product === 'string') {
            // If productId is just a string, we need to handle it differently
            productData = {
              id: product,
              name: `Product ${product}`,
              image: '',
              price: item.price || 0,
            };
          } else if (product instanceof Types.ObjectId) {
            // If productId is an ObjectId
            productData = {
              id: product.toString(),
              name: `Product ${product.toString()}`,
              image: '',
              price: item.price || 0,
            };
          } else {
            // If productId is a populated product object
            productData = {
              id: product.id || product._id?.toString() || product.toString(),
              name:
                product.productName || `Product ${product.id || product._id}`,
              image: product.productImages?.[0] || product.image || '',
              price: item.price || product.price || 0,
            };
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

        this.logger.debug(
          'Creating order items from selection:',
          JSON.stringify(orderItemsData, null, 2),
        );
        await this.orderItemsModel.insertMany(orderItemsData);
        this.logger.debug(
          `Created ${orderItemsData.length} order items from selection`,
        );
      }

      // Remove selected items from cart using existing method
      if (data.selectedProductIds.length > 0) {
        try {
          await this.cartService.checkoutSelectedItems(
            data.userId,
            data.selectedProductIds,
          );
          this.logger.debug('Selected items removed from cart successfully');
        } catch (cartError) {
          this.logger.error(
            `Failed to remove selected items from cart: ${cartError.message}`,
            cartError.stack,
          );
        }
      }

      // Return the complete order with items
      const orderId = savedOrder._id as Types.ObjectId;
      return this.findOne(orderId.toString());
    } catch (error) {
      this.logger.error(
        `Error creating order from selected cart items: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getRevenueFromOrders(): Promise<
    Array<{
      date: string;
      revenue: number;
      orderCount: number;
    }>
  > {
    try {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      const orders = await this.ordersModel
        .find({
          status: 'approved',
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .lean()
        .exec();

      const days: Array<{
        date: string;
        revenue: number;
        orderCount: number;
      }> = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayOrders = orders.filter((order) => {
          const orderDoc = order as unknown as { createdAt: Date };
          return orderDoc.createdAt.toISOString().split('T')[0] === dateStr;
        });

        const dailyRevenue = dayOrders.reduce(
          (sum, order) => sum + (order.totalAmount || 0),
          0,
        );

        days.push({
          date: dateStr,
          revenue: dailyRevenue,
          orderCount: dayOrders.length,
        });
      }

      return days.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      this.logger.error(
        `Error calculating revenue from orders: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
