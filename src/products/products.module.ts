import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from './schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Product.name,
        useFactory: () => {
          const schema = ProductSchema;
          // Force rebuild of schema to apply changes
          schema.set('toJSON', {
            virtuals: true,
            transform: (doc, ret) => {
              ret.id = ret._id;
              delete ret._id;
              delete ret.__v;
              return ret;
            },
          });
          return schema;
        },
      },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}