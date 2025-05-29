import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty } from 'class-validator';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
    @IsNotEmpty()
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User'  })
    userId: string;

    @IsNotEmpty()
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product' })
    productId: string;

    @IsNotEmpty()
    @Prop({ required: true })
    rating: number;

    @Prop()
    content: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);