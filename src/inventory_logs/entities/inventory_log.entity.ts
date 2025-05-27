import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export interface ProductQuantity {
  productId: string;
  quantity: number;
}

@Schema({ timestamps: true })
export class InventoryLog {
    @Prop({ required: true })
    @IsNotEmpty()
    batch: string;

    @Prop({ 
      type: [{ 
        productId: { type: MongooseSchema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true }
      }], 
      required: true 
    })
    products: ProductQuantity[];

    @Prop({ required: true, enum: ['import', 'export'] })
    @IsNotEmpty()
    action: string;

    @Prop({ required: true, enum: ['pending', 'completed', 'denied'], default: 'pending' })
    status: string;

    @Prop({ type: MongooseSchema.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: String, required: false })
    @IsOptional()
    reason: string;
}

export type InventoryLogDocument = InventoryLog & Document;
export const InventoryLogSchema = SchemaFactory.createForClass(InventoryLog);