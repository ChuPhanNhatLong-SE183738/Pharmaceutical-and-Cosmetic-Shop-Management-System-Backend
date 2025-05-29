import { Test, TestingModule } from '@nestjs/testing';
import { AnalyseController } from './analyse.controller';
import { AnalyseService } from './analyse.service';

describe('AnalyseController', () => {
  let controller: AnalyseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyseController],
      providers: [AnalyseService],
    }).compile();

    controller = module.get<AnalyseController>(AnalyseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
