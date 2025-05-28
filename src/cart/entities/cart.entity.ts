import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId | MongooseSchema.Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;
}

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Users', required: true })
  userId: Types.ObjectId | MongooseSchema.Types.ObjectId;

  @Prop([CartItem])
  items: CartItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
