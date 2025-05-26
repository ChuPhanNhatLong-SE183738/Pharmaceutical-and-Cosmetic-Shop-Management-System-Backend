import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto, AddToCartDto } from './dto/update-cart.dto';
import { Cart, CartDocument, CartItem } from './entities/cart.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>
  ) {}

  async create(createCartDto: CreateCartDto): Promise<CartDocument> {
    // Check if user already has a cart
    const existingCart = await this.findByUserId(createCartDto.userId);
    if (existingCart) {
      return existingCart;
    }

    // Calculate total price if items are provided
    let totalPrice = 0;
    if (createCartDto.items && createCartDto.items.length > 0) {
      totalPrice = createCartDto.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    const newCart = new this.cartModel({
      ...createCartDto,
      totalPrice
    });
    
    return newCart.save();
  }

  async findAll(): Promise<CartDocument[]> {
    return this.cartModel.find().exec();
  }

  async findOne(id: string): Promise<CartDocument> {
    const cart = await this.cartModel.findById(id).exec();
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    return cart;
  }

  async findByUserId(userId: Types.ObjectId): Promise<CartDocument | null> {
    return this.cartModel.findOne({ userId }).exec();
  }

  async update(id: string, updateCartDto: UpdateCartDto): Promise<CartDocument> {
    // Calculate total price if items are being updated
    if (updateCartDto.items) {
      updateCartDto.totalPrice = updateCartDto.items.reduce(
        (sum, item) => sum + (item.price * item.quantity), 
        0
      );
    }
    
    const updatedCart = await this.cartModel
      .findByIdAndUpdate(id, updateCartDto, { new: true })
      .exec();
      
    if (!updatedCart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    return updatedCart;
  }

  async addToCart(userId: Types.ObjectId, addToCartDto: AddToCartDto): Promise<CartDocument> {
    try {
      let cart = await this.findByUserId(userId);
      
      if (!cart) {
        // Create new cart if user doesn't have one
        cart = await this.create({ 
          userId, 
          items: [], 
          totalPrice: 0 
        });
      }

      // Check if product already in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === addToCartDto.productId.toString()
      );

      if (existingItemIndex > -1) {
        // Update quantity if product already in cart
        const existingItem = cart.items[existingItemIndex];
        existingItem.quantity += addToCartDto.quantity;
        
        // Update total price
        cart.totalPrice += (existingItem.price * addToCartDto.quantity);
      } else {
        // Add new item to cart - ensure productId is compatible
        const newItem: CartItem = {
          // Convert to appropriate ObjectId if needed
          productId: new Types.ObjectId(addToCartDto.productId.toString()),
          quantity: addToCartDto.quantity,
          price: addToCartDto.price
        };
        
        cart.items.push(newItem);
        cart.totalPrice += (addToCartDto.price * addToCartDto.quantity);
      }

      // Use markModified to ensure Mongoose detects the changes to the array
      cart.markModified('items');
      return await cart.save();
    } catch (error) {
      console.error('Error saving cart:', error);
      throw new BadRequestException('Failed to save cart: ' + error.message);
    }
  }

  async removeFromCart(userId: Types.ObjectId, productId: Types.ObjectId): Promise<CartDocument> {
    const cart = await this.findByUserId(userId);
    
    if (!cart) {
      throw new NotFoundException(`Cart for user ${userId} not found`);
    }

    // Get the items to be removed for price calculation
    const itemsToRemove = cart.items.filter(
      item => item.productId.toString() === productId.toString()
    );
    
    // Calculate price reduction
    const priceReduction = itemsToRemove.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );

    // Remove the items
    cart.items = cart.items.filter(
      item => item.productId.toString() !== productId.toString()
    );
    
    // Update total price
    cart.totalPrice = Math.max(0, cart.totalPrice - priceReduction);
    
    cart.markModified('items');
    return cart.save();
  }

  async remove(id: string): Promise<CartDocument> {
    const deletedCart = await this.cartModel.findByIdAndDelete(id).exec();
    
    if (!deletedCart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }
    return deletedCart;
  }

  async clearCart(userId: Types.ObjectId): Promise<CartDocument> {
    const cart = await this.findByUserId(userId);
    
    if (!cart) {
      throw new NotFoundException(`Cart for user ${userId} not found`);
    }

    cart.items = [];
    cart.totalPrice = 0;
    
    return cart.save();
  }
}
