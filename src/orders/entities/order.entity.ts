import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type OrdersDocument = Orders & Document;

@Schema()
export class Order_Items {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId[] | MongooseSchema.Types.ObjectId[];

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId | MongooseSchema.Types.ObjectId;
}

@Schema({ timestamps: true })
export class Orders {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Users', required: true })
  userId: Types.ObjectId | MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Transactions',
    required: true,
  })
  transactionId: Types.ObjectId | MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['pending', 'approved', 'rejected'] })
  status: string;
}

export const OrdersSchema = SchemaFactory.createForClass(Orders);
