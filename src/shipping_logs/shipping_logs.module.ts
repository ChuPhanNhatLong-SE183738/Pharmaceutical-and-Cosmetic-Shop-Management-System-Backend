import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingLogsService } from './shipping_logs.service';
import { ShippingLogsController } from './shipping_logs.controller';
import { ShippingLog, ShippingLogSchema } from './entities/shipping_log.entity';
import { Orders, OrdersSchema, Order_Items, Order_ItemsSchema } from '../orders/entities/order.entity';
import { User, UserSchema } from '../users/entities/user.entity';
import { Transaction, TransactionSchema } from '../transactions/entities/transaction.entity';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShippingLog.name, schema: ShippingLogSchema },
      { name: Orders.name, schema: OrdersSchema },
      { name: Order_Items.name, schema: Order_ItemsSchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    forwardRef(() => OrdersModule),
    ProductsModule,  ],  controllers: [ShippingLogsController],  providers: [ShippingLogsService],
  exports: [ShippingLogsService],
})
export class ShippingLogsModule {}
