import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryLogsService } from './inventory_logs.service';
import { InventoryLogsController } from './inventory_logs.controller';
import { InventoryLog, InventoryLogSchema } from './entities/inventory_log.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryLog.name, schema: InventoryLogSchema }
    ]),
    ProductsModule, 
  ],
  controllers: [InventoryLogsController],
  providers: [InventoryLogsService],
  exports: [InventoryLogsService],
})
export class InventoryLogsModule {}
