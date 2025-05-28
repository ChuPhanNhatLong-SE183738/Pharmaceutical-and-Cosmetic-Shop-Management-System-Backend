import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Schema as MongooseSchema } from 'mongoose';
import { Cart, CartDocument } from './entities/cart.entity';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto, AddToCartDto } from './dto/update-cart.dto';
import { ProductsService } from '../products/products.service';
import { Product, ProductDocument } from 'src/products/schemas/product.schema';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>, // Fix this line
    private productsService: ProductsService,
  ) {}

  async create(createCartDto: CreateCartDto): Promise<CartDocument> {
    const newCart = new this.cartModel(createCartDto);
    return newCart.save();
  }

  async findAll(): Promise<CartDocument[]> {
    return this.cartModel.find().populate('items.product').exec();
  }

  async findOne(id: string): Promise<CartDocument | null> {
    try {
      this.logger.debug(`Finding cart by id: ${id}`);
      const cart = await this.cartModel.findById(id).exec();
      this.logger.debug(`Found cart: ${JSON.stringify(cart)}`);
      return cart;
    } catch (error) {
      this.logger.error(`Error finding cart: ${error.message}`);
      throw error;
    }
  }

  async findByUserId(userId: Types.ObjectId): Promise<CartDocument | null> {
    this.logger.log(`Finding cart for user: ${userId}`);

    return this.cartModel
      .findOne({ userId })
      .populate({
        path: 'items.productId',
        model: 'Product',
        options: { lean: true },
      })
      .lean()
      .exec();
  }

  async addToCart(userId: string, productId: string, quantity: number) {
    // Fetch the product to get the current price
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Calculate price with sale percentage
    const discountedPrice =
      product.salePercentage !== null && product.salePercentage > 0
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;

    // Find the user's cart or create a new one
    let cart = await this.cartModel.findOne({ userId });

    if (!cart) {
      cart = new this.cartModel({
        userId,
        items: [],
        totalAmount: 0,
      });
    }

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      cart.items[existingItemIndex].quantity += quantity;
      // Always update price to reflect current pricing
      cart.items[existingItemIndex].price = discountedPrice;
    } else {
      // Add new item
      cart.items.push({
        productId: new Types.ObjectId(productId),
        quantity,
        price: discountedPrice, // Using discounted price
      });
    }

    // Recalculate total amount
    const totalAmount = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    cart.set('totalAmount', totalAmount);

    // Save and return updated cart
    return cart.save();
  }

  async removeFromCart(
    userId: Types.ObjectId,
    productId: Types.ObjectId,
  ): Promise<CartDocument> {
    try {
      const cart = await this.cartModel.findOne({ userId });

      if (!cart) {
        throw new NotFoundException(`Cart for user ${userId} not found`);
      }

      await this.cartModel.updateOne(
        { _id: cart._id },
        {
          $pull: {
            items: {
              productId: productId,
            },
          },
        },
      );

      const updatedCart = await this.cartModel.findById(cart._id);
      if (!updatedCart) {
        throw new NotFoundException(
          `Could not find updated cart after removal`,
        );
      }

      // Recalculate total amount
      const totalAmount = updatedCart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );
      updatedCart.set('totalAmount', totalAmount);
      await updatedCart.save();

      return updatedCart;
    } catch (error) {
      this.logger.error(`Error removing item from cart: ${error.message}`);
      throw error;
    }
  }

  async clearCart(userId: Types.ObjectId): Promise<CartDocument> {
    try {
      const cart = await this.cartModel.findOne({ userId });

      if (!cart) {
        throw new NotFoundException(`Cart for user ${userId} not found`);
      }
      
      // Use findOneAndUpdate instead of manual save to avoid version conflicts
      const updatedCart = await this.cartModel.findOneAndUpdate(
        { userId },
        { $set: { items: [], totalAmount: 0 } },
        { new: true, runValidators: true }
      );
      
      if (!updatedCart) {
        throw new NotFoundException(`Failed to update cart for user ${userId}`);
      }
      
      this.logger.debug(`Successfully cleared cart for user: ${userId}`);
      return updatedCart;
    } catch (error) {
      this.logger.error(`Error clearing cart: ${error.message}`, error.stack);
      
      // Better error handling with specific messages
      if (error.name === 'VersionError' || error.message.includes('version')) {
        throw new ConflictException('Cart was modified by another operation. Please try again.');
      }
      
      throw error;
    }
  }

  async update(
    id: string,
    updateCartDto: UpdateCartDto,
  ): Promise<CartDocument> {
    try {
      const cart = await this.cartModel.findById(id);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${id} not found`);
      }

      if (updateCartDto.items) {
        // If updating items, recalculate total amount
        const totalAmount = updateCartDto.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        );
        updateCartDto.totalAmount = totalAmount;
      }

      // Use findOneAndUpdate to avoid version conflicts
      const updatedCart = await this.cartModel.findByIdAndUpdate(
        id,
        updateCartDto,
        { new: true, runValidators: true },
      );

      if (!updatedCart) {
        throw new NotFoundException(`Failed to update cart with ID ${id}`);
      }

      return updatedCart;
    } catch (error) {
      this.logger.error(`Error updating cart: ${error.message}`);
      
      if (error.name === 'VersionError' || error.message.includes('version')) {
        throw new ConflictException('Cart was modified by another operation. Please try again.');
      }
      
      throw error;
    }
  }

  async remove(id: string): Promise<CartDocument> {
    try {
      const cart = await this.cartModel.findByIdAndDelete(id);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${id} not found`);
      }

      return cart;
    } catch (error) {
      this.logger.error(`Error removing cart: ${error.message}`);
      throw error;
    }
  }

  async checkoutSelectedItems(
    userId: string,
    productIds: string[],
  ): Promise<CartDocument> {
    try {
      // Find the user's cart
      const cart = await this.cartModel.findOne({
        userId: new Types.ObjectId(userId),
      });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      // Convert product IDs to ObjectId
      const productObjectIds = productIds.map((id) => new Types.ObjectId(id));

      // Use findOneAndUpdate to avoid version conflicts
      const updatedCart = await this.cartModel.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $pull: {
            items: {
              productId: { $in: productObjectIds }
            }
          }
        },
        { new: true }
      );

      if (!updatedCart) {
        throw new NotFoundException(`Failed to update cart for checkout`);
      }

      // Recalculate total amount
      const totalAmount = updatedCart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );
      
      // Update the total amount in a separate operation
      const finalCart = await this.cartModel.findByIdAndUpdate(
        updatedCart._id,
        { totalAmount },
        { new: true }
      );

      return finalCart || updatedCart;
    } catch (error) {
      this.logger.error(`Error in checkout selected items: ${error.message}`, error.stack);
      
      if (error.name === 'VersionError' || error.message.includes('version')) {
        throw new ConflictException('Cart was modified by another operation. Please try again.');
      }
      
      throw error;
    }
  }
}
