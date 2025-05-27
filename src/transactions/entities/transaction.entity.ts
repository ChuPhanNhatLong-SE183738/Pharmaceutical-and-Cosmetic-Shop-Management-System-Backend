import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
    @Prop({ required: true })
    orderId: string;
    
    @Prop({ required: true, enum: ['pending', 'success', 'failed'] })
    status: string;
    
    @Prop({ required: true })
    totalAmount: number;
    
    @Prop()
    paymentMethod?: string;
    
    @Prop({ type: Object })
    paymentDetails?: Record<string, any>;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
