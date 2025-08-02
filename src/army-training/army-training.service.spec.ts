import { Test, TestingModule } from '@nestjs/testing';
import { ArmyTrainingService } from './army-training.service';

describe('ArmyTrainingService', () => {
  let service: ArmyTrainingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArmyTrainingService],
    }).compile();

    service = module.get<ArmyTrainingService>(ArmyTrainingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
