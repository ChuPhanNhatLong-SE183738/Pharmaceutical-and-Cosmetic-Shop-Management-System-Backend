import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

// Update CartItem interface to be more flexible with ObjectId types
export interface CartItem {
  // Accept either type of ObjectId
  productId: Types.ObjectId | MongooseSchema.Types.ObjectId;
  quantity: number;
  price: number;
}

// Define a type for the Cart document that includes all properties
export type CartDocument = Document & {
  userId: Types.ObjectId | MongooseSchema.Types.ObjectId;
  items: CartItem[];
  totalPrice: number;
};

@Schema()
export class Cart {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', unique: true })
  userId: MongooseSchema.Types.ObjectId;
  
  @Prop({ 
    type: [{
      productId: { type: MongooseSchema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, default: 1 },
      price: { type: Number, required: true }
    }],
    default: []
  })
  items: CartItem[];
  
  @Prop({ default: 0 })
  totalPrice: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
