import { Test, TestingModule } from '@nestjs/testing';
import { ShippingLogsService } from './shipping_logs.service';

describe('ShippingLogsService', () => {
  let service: ShippingLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShippingLogsService],
    }).compile();

    service = module.get<ShippingLogsService>(ShippingLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
