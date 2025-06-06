import { Test, TestingModule } from '@nestjs/testing';
import { VillagesCrawlerService } from './villages-crawler.service';

describe('VillagesCrawlerService', () => {
  let service: VillagesCrawlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VillagesCrawlerService],
    }).compile();

    service = module.get<VillagesCrawlerService>(VillagesCrawlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
