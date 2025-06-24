import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { InventoryLogsService } from './inventory_logs.service';
import { InventoryLogsController } from './inventory_logs.controller';
import { InventoryLog, InventoryLogSchema, InventoryLogItems, InventoryLogItemsSchema } from './entities/inventory_log.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryLog.name, schema: InventoryLogSchema },
      { name: InventoryLogItems.name, schema: InventoryLogItemsSchema }
    ]),
    ProductsModule,
    ScheduleModule.forRoot(), // Enable scheduling for this module
  ],
  controllers: [InventoryLogsController],
  providers: [InventoryLogsService],
  exports: [InventoryLogsService],
})
export class InventoryLogsModule {}
