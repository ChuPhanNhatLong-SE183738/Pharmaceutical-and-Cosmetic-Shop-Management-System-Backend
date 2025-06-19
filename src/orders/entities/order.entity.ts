import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export type Order_ItemsDocument = Order_Items & Document;
export type OrdersDocument = Orders & Document;

@Schema({ timestamps: true })
export class Order_Items {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Orders', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, default: 0 })
  price: number;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productImage: string;
}

export const Order_ItemsSchema = SchemaFactory.createForClass(Order_Items);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Orders {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: () => User })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: () => Transaction })
  transactionId: Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      'pending',
      'approved',
      'rejected',
      'shipping',
      'delivered',
      'canceled',
      'refunded',
    ],
  })
  status: string;

  @Prop({ required: true, default: 0 })
  totalAmount: number;

  @Prop()
  shippingAddress: string;

  @Prop()
  contactPhone: string;

  @Prop()
  notes: string;

  @Prop()
  rejectionReason: string;

  @Prop()
  refundReason: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: () => User })
  processedBy: Types.ObjectId;
}

export const OrdersSchema = SchemaFactory.createForClass(Orders);

// Add virtual field for order items
OrdersSchema.virtual('items', {
  ref: 'Order_Items',
  localField: '_id',
  foreignField: 'orderId',
});
