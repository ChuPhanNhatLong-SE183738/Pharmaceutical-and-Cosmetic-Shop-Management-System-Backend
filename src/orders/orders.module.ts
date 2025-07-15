import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import {
  Orders,
  OrdersSchema,
  Order_Items,
  Order_ItemsSchema,
} from './entities/order.entity';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { User, UserSchema } from '../users/entities/user.entity';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/entities/transaction.entity';
import { ShippingLogsModule } from '../shipping_logs/shipping_logs.module';
import { InventoryLogsModule } from '../inventory_logs/inventory_logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Orders.name, schema: OrdersSchema },
      { name: Order_Items.name, schema: Order_ItemsSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema }, // Add Transaction schema
    ]),
    CartModule,
    UsersModule,
    TransactionsModule,
    ShippingLogsModule,
    InventoryLogsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
