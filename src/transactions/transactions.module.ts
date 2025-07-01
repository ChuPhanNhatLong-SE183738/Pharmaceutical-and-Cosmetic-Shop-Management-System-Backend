import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { Orders, OrdersSchema, Order_Items, Order_ItemsSchema } from '../orders/entities/order.entity';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Category, CategorySchema } from '../categories/entities/category.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Transaction.name,
        schema: TransactionSchema,
        collection: 'transactions', // Đảm bảo tên collection là số nhiều
      },
      {
        name: Orders.name,
        schema: OrdersSchema,
      },
      {
        name: Order_Items.name,
        schema: Order_ItemsSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService, MongooseModule], // Export MongooseModule để các module khác có thể sử dụng model
})
export class TransactionsModule {}
