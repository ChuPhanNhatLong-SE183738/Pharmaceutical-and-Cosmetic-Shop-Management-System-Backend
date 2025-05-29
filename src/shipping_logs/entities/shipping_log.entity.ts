import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ShippingStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  SHIPPED = 'Shipped',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  RECEIVED = 'Received',
  CANCELLED = 'Cancelled',
  RETURNED = 'Returned',
}

@Schema({ timestamps: true })
export class ShippingLog extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Orders' })
  orderId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: ShippingStatus,
    default: ShippingStatus.PENDING,
  })
  status: string;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ShippingLogSchema = SchemaFactory.createForClass(ShippingLog);
