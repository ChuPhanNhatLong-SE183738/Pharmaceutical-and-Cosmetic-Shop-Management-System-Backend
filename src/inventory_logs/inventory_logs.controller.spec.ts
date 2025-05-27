import { Test, TestingModule } from '@nestjs/testing';
import { InventoryLogsController } from './inventory_logs.controller';
import { InventoryLogsService } from './inventory_logs.service';

describe('InventoryLogsController', () => {
  let controller: InventoryLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryLogsController],
      providers: [InventoryLogsService],
    }).compile();

    controller = module.get<InventoryLogsController>(InventoryLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
