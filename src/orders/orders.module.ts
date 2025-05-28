import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Orders, OrdersSchema } from './entities/order.entity';
import { Order_Items } from './entities/order.entity';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Orders.name, schema: OrdersSchema },
      { name: Order_Items.name, schema: OrdersSchema }, // This should be Order_ItemsSchema
    ]),
    CartModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // Explicitly exporting OrdersService
})
export class OrdersModule {}
