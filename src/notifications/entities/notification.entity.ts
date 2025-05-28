import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  userType: 'staff' | 'customer';

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Orders', required: false })
  orderId: MongooseSchema.Types.ObjectId;

  @Prop({ default: 'medium', enum: ['low', 'medium', 'high'] })
  priority: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
