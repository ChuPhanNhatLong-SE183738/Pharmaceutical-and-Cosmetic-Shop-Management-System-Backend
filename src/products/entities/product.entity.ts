import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema()
export class Review {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  rating: number;

  @Prop()
  comment: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export enum SuitableFor {
  ALL = 'All skin types',
  DRY = 'Dry skin',
  OILY = 'Oily skin',
  SENSITIVE = 'Sensitive skin',
  COMBINATION = 'Combination skin',
  NORMAL = 'Normal skin',
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  productName: string;

  @Prop()
  productDescription: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  stock: number;

  @Prop({ type: [String], default: [] }) // Explicitly using String array with default empty array
  category: string[];

  @Prop()
  brand: string;

  @Prop({ type: [String], default: [] }) // Making this consistent too
  productImages: string[];

  @Prop()
  ingredients: string;

  @Prop({ type: String, enum: Object.values(SuitableFor), default: SuitableFor.ALL })
  suitableFor: SuitableFor;

  @Prop([Review])
  reviews: Review[];
  
  @Prop({ default: 0, min: 0, max: 100 })
  salePercentage: number;
  
  @Prop()
  expiryDate: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
