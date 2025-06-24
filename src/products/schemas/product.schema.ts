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
  @Prop({ required: true })
  productName: string;

  @Prop()
  image: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop()
  productDescription: string;

  @IsNotEmpty()
  @Prop({ required: true })
  stock: number;

  @IsNotEmpty()
  @Prop({ 
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Category' }],
    required: true,
    get: (categories: any[]) => {
      if (!categories) return [];
      return categories;
    },
    set: (categories: any[]) => {
      if (!categories) return [];
      return categories;
    }
  })
  category: Category[] | string[] | MongooseSchema.Types.ObjectId[];

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

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Reviews' }], default: [] })
  reviews: string[] | MongooseSchema.Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  averageRating: number;

  @Prop({ type: Number, default: null })
  salePercentage: number | null;
}

const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.pre('save', function(next) {
  if (this.isModified('stock') && !this.isModified('category')) {
    this.$locals.skipCategoryValidation = true;
  }
  next();
});

ProductSchema.path('category').validate(function(value) {
  if (this.$locals.skipCategoryValidation) {
  }
  return Array.isArray(value) && value.length > 0;
});

export { ProductSchema };