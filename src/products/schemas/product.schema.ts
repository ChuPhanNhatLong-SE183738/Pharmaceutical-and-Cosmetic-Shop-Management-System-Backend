import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsDate, IsDateString, IsNotEmpty } from 'class-validator';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Category } from '../../categories/entities/category.entity';

export enum SuitableForType {
  ALL_SKIN_TYPES = 'All skin types',
  DRY_SKIN = 'Dry skin',
  OILY_SKIN = 'Oily skin',
  COMBINATION_SKIN = 'Combination skin',
  SENSITIVE_SKIN = 'Sensitive skin',
  NORMAL_SKIN = 'Normal skin',
}

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @IsNotEmpty()
  @Prop({ required: true })
  productName: string;

  @Prop()
  productDescription: string;

  @IsNotEmpty()
  @Prop({ required: true })
  price: number;

  @IsNotEmpty()
  @Prop({ required: true })
  stock: number;

  @IsNotEmpty()
  @Prop({ 
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Category' }],
    required: true 
  })
  category: Category[] | string[];

  @IsNotEmpty()
  @Prop({ required: true })
  brand: string;

  @IsNotEmpty()
  @Prop({ required: true })
  productImages: string[];

  @IsNotEmpty()
  @Prop({ required: true })
  ingredients: string;

  @IsNotEmpty()
  @Prop({ 
    required: true,
    type: String,
    enum: Object.values(SuitableForType),
  })
  suitableFor: string;

  @Prop({ type: [String], default: [] })
  reviews: string[];

  @Prop({ type: Number, default: null })
  salePercentage: number | null;

  @IsDateString()
  @Prop({ required: true })
  expiryDate: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);