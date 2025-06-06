import { Test, TestingModule } from '@nestjs/testing';
import { VillagesController } from './villages.controller';
import { VillagesService } from './villages.service';
import { VillagesCrawlerService } from '@/villages-crawler/villages-crawler.service';

describe('VillagesController', () => {
    let controller: VillagesController;
    let mockVillagesService: Partial<VillagesService>;
    let mockVillagesCrawlerService: Partial<VillagesCrawlerService>;

    beforeEach(async () => {
        mockVillagesService = {
            getAllVillages: jest.fn(),
            getVillageById: jest.fn(),
            updateAutoScavenging: jest.fn(),
            updateAutoBuild: jest.fn(),
            syncVillagesWithDatabase: jest.fn(),
            shouldRefreshData: jest.fn(),
        };

        mockVillagesCrawlerService = {
            getOverviewVillageInformation: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [VillagesController],
            providers: [
                { provide: VillagesService, useValue: mockVillagesService },
                { provide: VillagesCrawlerService, useValue: mockVillagesCrawlerService },
            ],
        }).compile();

        controller = module.get<VillagesController>(VillagesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
}); 