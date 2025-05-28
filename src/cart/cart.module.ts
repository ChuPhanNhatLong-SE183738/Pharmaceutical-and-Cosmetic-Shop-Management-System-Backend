import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './entities/cart.entity';
import { ProductsModule } from '../products/products.module';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema }
    ]),
    ProductsModule
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService]
})
export class CartModule {}
