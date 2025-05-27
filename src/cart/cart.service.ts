import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Schema as MongooseSchema } from 'mongoose';
import { Cart, CartDocument } from './entities/cart.entity';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto, AddToCartDto } from './dto/update-cart.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private productsService: ProductsService,
  ) {}

  async create(createCartDto: CreateCartDto): Promise<CartDocument> {
    const newCart = new this.cartModel(createCartDto);
    return newCart.save();
  }

  async findAll(): Promise<CartDocument[]> {
    return this.cartModel.find().populate('items.product').exec();
  }

  async findOne(id: string): Promise<CartDocument> {
    const cart = await this.cartModel.findById(id)
      .populate('items.product')
      .exec();
      
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    
    return cart;
  }

  async findByUserId(userId: Types.ObjectId): Promise<CartDocument | null> {
    this.logger.log(`Finding cart for user: ${userId}`);
    
    return this.cartModel.findOne({ userId })
      .populate({
        path: 'items.productId', 
        model: 'Product',
        options: { lean: true }
      })
      .lean()
      .exec();
  }

  async addToCart(userId: Types.ObjectId, addToCartDto: AddToCartDto): Promise<CartDocument> {
    try {
      const { productId, quantity } = addToCartDto;
      
      if (!Types.ObjectId.isValid(productId)) {
        throw new BadRequestException('Invalid product ID format');
      }
      
      let cart = await this.findByUserId(userId);
      
      if (!cart) {
        this.logger.warn(`No cart found for user ${userId}. Creating a new one.`);
        cart = await this.create({ 
          userId, 
          items: [],
          totalPrice: 0
        });
      }

      const product = await this.productsService.findOne(productId.toString());
      
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      
      if (typeof product.price !== 'number' || isNaN(product.price) || product.price < 0) {
        throw new BadRequestException(`Invalid price for product ${productId}: ${product.price}`);
      }

      const productObjectId = new Types.ObjectId(productId);
      
      let existingItemIndex = -1;
      if (cart.items && cart.items.length > 0) {
        for (let i = 0; i < cart.items.length; i++) {
          const item = cart.items[i];
          const itemProductId = item.productId;
          
          let itemProductIdString;
          
          if (typeof itemProductId === 'string') {
            itemProductIdString = itemProductId;
          } else if (itemProductId && typeof itemProductId === 'object') {
            if ('_id' in itemProductId) {
              itemProductIdString = itemProductId._id.toString();
            } else {
              itemProductIdString = itemProductId.toString();
            }
          } else {
            itemProductIdString = String(itemProductId);
          }
          
          if (itemProductIdString === productId.toString()) {
            existingItemIndex = i;
            break;
          }
        }
      }
      
      const cartId = cart._id;
      
      let updateOperation;
      if (existingItemIndex > -1) {
        updateOperation = {
          $inc: {
            [`items.${existingItemIndex}.quantity`]: quantity
          }
        };
        this.logger.debug(`Updating quantity for existing item at index ${existingItemIndex}`);
      } else {
        updateOperation = {
          $push: {
            items: {
              productId: productObjectId,
              price: product.price,
              quantity
            }
          }
        };
        this.logger.debug(`Adding new item to cart`);
      }
      
      const updatedCart = await this.cartModel.findByIdAndUpdate(
        cartId,
        updateOperation,
        { new: true }
      );
      
      if (!updatedCart) {
        throw new InternalServerErrorException('Failed to update cart');
      }
      
      const totalPrice = updatedCart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
      
      updatedCart.totalPrice = totalPrice;
      await updatedCart.save();
      
      this.logger.debug(`Cart updated successfully`);
      
      const savedCart = await this.findByUserId(userId);
      if (!savedCart) {
        throw new Error("Failed to retrieve cart after updating");
      }
      
      return savedCart;
    } catch (error) {
      this.logger.error(`Error adding to cart: ${error.message}`);
      throw error;
    }
  }

  async removeFromCart(userId: Types.ObjectId, productId: Types.ObjectId): Promise<CartDocument> {
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
              productId: productId 
            } 
          } 
        }
      );
      
      const updatedCart = await this.cartModel.findById(cart._id);
      
      if (!updatedCart) {
        throw new InternalServerErrorException('Failed to retrieve cart after removing item');
      }
      
      updatedCart.totalPrice = updatedCart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
      
      await updatedCart.save();

      const savedCart = await this.findByUserId(userId);
      if (!savedCart) {
        throw new Error("Failed to retrieve cart after removing item");
      }
      
      return savedCart;
    } catch (error) {
      this.logger.error(`Error removing from cart: ${error.message}`);
      throw error;
    }
  }

  async clearCart(userId: Types.ObjectId): Promise<CartDocument> {
    try {
      const cart = await this.cartModel.findOne({ userId });
      
      if (!cart) {
        throw new NotFoundException(`Cart for user ${userId} not found`);
      }

      await this.cartModel.updateOne(
        { _id: cart._id },
        { 
          $set: { 
            items: [],
            totalPrice: 0
          } 
        }
      );

      const savedCart = await this.findByUserId(userId);
      if (!savedCart) {
        throw new Error("Failed to retrieve cart after clearing");
      }
      
      return savedCart;
    } catch (error) {
      this.logger.error(`Error clearing cart: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateCartDto: UpdateCartDto): Promise<CartDocument> {
    const updatedCart = await this.cartModel
      .findByIdAndUpdate(id, updateCartDto, { new: true })
      .exec();
      
    if (!updatedCart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    
    return updatedCart;
  }

  async remove(id: string): Promise<CartDocument> {
    const deletedCart = await this.cartModel.findByIdAndDelete(id).exec();
    
    if (!deletedCart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    
    return deletedCart;
  }
}
