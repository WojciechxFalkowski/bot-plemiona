import { Test, TestingModule } from '@nestjs/testing';
import { ArmyTrainingController } from './army-training.controller';
import { ArmyTrainingService } from './army-training.service';

describe('ArmyTrainingController', () => {
  let controller: ArmyTrainingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArmyTrainingController],
      providers: [ArmyTrainingService],
    }).compile();

    controller = module.get<ArmyTrainingController>(ArmyTrainingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
