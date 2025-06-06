import { Test, TestingModule } from '@nestjs/testing';
import { VillagesCrawlerController } from './villages-crawler.controller';
import { VillagesCrawlerService } from './villages-crawler.service';

describe('VillagesCrawlerController', () => {
  let controller: VillagesCrawlerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VillagesCrawlerController],
      providers: [VillagesCrawlerService],
    }).compile();

    controller = module.get<VillagesCrawlerController>(VillagesCrawlerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
