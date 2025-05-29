import { Test, TestingModule } from '@nestjs/testing';
import { ShippingLogsController } from './shipping_logs.controller';
import { ShippingLogsService } from './shipping_logs.service';

describe('ShippingLogsController', () => {
  let controller: ShippingLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShippingLogsController],
      providers: [ShippingLogsService],
    }).compile();

    controller = module.get<ShippingLogsController>(ShippingLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
