import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Orders, OrdersDocument } from './entities/order.entity';
import { Order_Items } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
// Fix the import path to use the cart service from cart module, not carts
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Orders.name) private ordersModel: Model<OrdersDocument>,
    @InjectModel(Order_Items.name) private orderItemsModel: Model<Order_Items>,
    private readonly cartService: CartService, // Fixed the service name
  ) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    const newOrder = new this.ordersModel({
      userId: createOrderDto.userId,
      transactionId: createOrderDto.transactionId,
      status: createOrderDto.status,
    });
    const savedOrder = await newOrder.save();

    // Create order items
    const orderItems = createOrderDto.orderItems.map(item => ({
      orderId: savedOrder._id,
      productId: item.productId,
      quantity: item.quantity
    }));

    // Save all order items
    await this.orderItemsModel.insertMany(orderItems);

    // Use explicit type conversion for _id
    return this.findOne(savedOrder._id instanceof Types.ObjectId 
      ? savedOrder._id.toString() 
      : String(savedOrder._id));
  }

  async createOrderFromCart(data: {
    userId: string,
    cartId: string,
    transactionId: string,
    status: string
  }) {
    this.logger.debug('Creating order from cart:', data);
    
    try {
      // Get cart with items - using the CartService's findOne method
      const cart = await this.cartService.findOne(data.cartId);
      if (!cart) {
        throw new NotFoundException(`Cart with ID ${data.cartId} not found`);
      }

      // Create order
      const newOrder = new this.ordersModel({
        userId: data.userId,
        transactionId: data.transactionId,
        status: data.status,
      });
      const savedOrder = await newOrder.save();

      // Create order items from cart items
      const orderItems = cart.items.map(item => ({
        orderId: savedOrder._id,
        productId: item.productId,
        quantity: item.quantity
      }));

      // Save all order items
      await this.orderItemsModel.insertMany(orderItems);

      // Try to clear the cart after order creation
      try {
        // Use the userId from the cart for clearing
        await this.cartService.clearCart(new Types.ObjectId(cart.userId.toString()));
      } catch (cartError) {
        // Log but don't fail the entire operation if cart clearing fails
        this.logger.error(`Failed to clear cart: ${cartError.message}`, cartError.stack);
        // We could retry or implement a cleanup job later
      }

      // Use explicit type conversion for _id
      return this.findOne(savedOrder._id instanceof Types.ObjectId 
        ? savedOrder._id.toString() 
        : String(savedOrder._id));
    } catch (error) {
      this.logger.error(`Error creating order from cart: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll() {
    return this.ordersModel.find().exec();
  }

  async findOne(id: string) {
    const order = await this.ordersModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const orderItems = await this.orderItemsModel
      .find({ orderId: id })
      .populate('productId')
      .exec();

    return {
      ...order.toJSON(),
      items: orderItems
    };
  }
  
  async updateOrderStatus(id: string, status: string) {
    const order = await this.ordersModel.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    order.status = status;
    return order.save();
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    return this.ordersModel.findByIdAndUpdate(id, updateOrderDto, { new: true });
  }

  async remove(id: string) {
    return this.ordersModel.findByIdAndDelete(id);
  }
}
