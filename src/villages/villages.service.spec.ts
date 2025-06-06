import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VillagesService } from './villages.service';
import { VillageEntity } from './entities/village.entity';
import { NotFoundException } from '@nestjs/common';

describe('VillagesService', () => {
    let service: VillagesService;
    let repository: Repository<VillageEntity>;

    const mockRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VillagesService,
                {
                    provide: getRepositoryToken(VillageEntity),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<VillagesService>(VillagesService);
        repository = module.get<Repository<VillageEntity>>(getRepositoryToken(VillageEntity));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findById', () => {
        it('should return a village when found', async () => {
            const village = {
                id: '1',
                name: 'Test Village',
                coordinates: '500|500',
                isAutoBuildEnabled: false,
                isAutoScavengingEnabled: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRepository.findOne.mockResolvedValue(village);

            const result = await service.findById('1');

            expect(result).toEqual(village);
            expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
        });

        it('should throw NotFoundException when village not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.findById('999')).rejects.toThrow(NotFoundException);
        });
    });

    describe('toggleAutoScavenging', () => {
        it('should toggle auto-scavenging from false to true', async () => {
            const village = {
                id: '1',
                name: 'Test Village',
                coordinates: '500|500',
                isAutoBuildEnabled: false,
                isAutoScavengingEnabled: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRepository.findOne.mockResolvedValue(village);
            mockRepository.save.mockResolvedValue({ ...village, isAutoScavengingEnabled: true });

            const result = await service.toggleAutoScavenging('1');

            expect(result).toEqual({
                id: '1',
                isAutoScavengingEnabled: true,
            });
            expect(mockRepository.save).toHaveBeenCalled();
        });
    });
}); 