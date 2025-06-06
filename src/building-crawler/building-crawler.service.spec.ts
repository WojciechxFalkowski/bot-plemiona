import { Test, TestingModule } from '@nestjs/testing';
import { BuildingCrawlerService } from './building-crawler.service';

describe('BuildingCrawlerService', () => {
  let service: BuildingCrawlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BuildingCrawlerService],
    }).compile();

    service = module.get<BuildingCrawlerService>(BuildingCrawlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
