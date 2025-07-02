import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class InventoryLogItems {
  @Prop({ type: MongooseSchema.ObjectId, ref: 'InventoryLog', required: true })
  @IsNotEmpty()
  inventoryLogId: Types.ObjectId;

  @Prop({ type: MongooseSchema.ObjectId, ref: 'Product', required: true })
  @IsNotEmpty()
  productId: Types.ObjectId;

  @Prop({ required: true })
  @IsNotEmpty()
  quantity: number;

  @Prop({ required: false })
  @IsOptional()
  expiryDate?: Date;

  @Prop({ required: false })
  @IsOptional()
  price?: number;

  @Prop({ required: false })
  @IsOptional()
  batch?: string;

  @Prop({ required: true, min: 0 })
  stock: number;
}

export type InventoryLogItemsDocument = InventoryLogItems & Document;
export const InventoryLogItemsSchema =
  SchemaFactory.createForClass(InventoryLogItems);

@Schema({ timestamps: true })
export class InventoryLog {
  @Prop({ required: true, enum: ['import', 'export'] })
  @IsNotEmpty()
  action: string;

  @Prop({
    required: true,
    enum: ['pending', 'completed', 'denied'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: MongooseSchema.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: false })
  @IsOptional()
  reason: string;
}

export type InventoryLogDocument = InventoryLog & Document;
export const InventoryLogSchema = SchemaFactory.createForClass(InventoryLog);
