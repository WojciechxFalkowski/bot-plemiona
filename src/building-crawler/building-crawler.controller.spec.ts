import { Test, TestingModule } from '@nestjs/testing';
import { BuildingCrawlerController } from './building-crawler.controller';
import { BuildingCrawlerService } from './building-crawler.service';

describe('BuildingCrawlerController', () => {
  let controller: BuildingCrawlerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingCrawlerController],
      providers: [BuildingCrawlerService],
    }).compile();

    controller = module.get<BuildingCrawlerController>(BuildingCrawlerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
