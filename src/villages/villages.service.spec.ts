import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VillagesService } from './villages.service';
import { VillageEntity } from './entities/village.entity';
import { NotFoundException } from '@nestjs/common';
import { VILLAGES_ENTITY_REPOSITORY } from './villages.service.contracts';
import { SettingsService } from '@/settings/settings.service';
import { ConfigService } from '@nestjs/config';

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
                { provide: VILLAGES_ENTITY_REPOSITORY, useValue: mockRepository },
                { provide: SettingsService, useValue: {} },
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get<VillagesService>(VillagesService);
        repository = module.get(VILLAGES_ENTITY_REPOSITORY);
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

    describe('syncVillages', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should add new villages if not present', async () => {
            mockRepository.find.mockResolvedValue([]);
            mockRepository.create.mockImplementation((data) => data);
            mockRepository.save.mockImplementation(async (v) => v);

            const input = [
                { id: '1', name: 'A', coordinates: '100|100' },
                { id: '2', name: 'B', coordinates: '200|200' },
            ];

            const result = await service.syncVillages(input);
            expect(result).toEqual({ added: 2, updated: 0, deleted: 0, total: 2 });
            expect(mockRepository.create).toHaveBeenCalledTimes(2);
            expect(mockRepository.save).toHaveBeenCalledTimes(2);
        });

        it('should update existing villages if data changed', async () => {
            const existing = [
                { id: '1', name: 'A', coordinates: '100|100', isAutoBuildEnabled: false, isAutoScavengingEnabled: false, createdAt: new Date(), updatedAt: new Date() },
            ];
            mockRepository.find.mockResolvedValue(existing);
            mockRepository.save.mockImplementation(async (v) => v);

            const input = [
                { id: '1', name: 'A2', coordinates: '100|101' },
            ];

            const result = await service.syncVillages(input);
            expect(result).toEqual({ added: 0, updated: 1, deleted: 0, total: 1 });
            expect(mockRepository.save).toHaveBeenCalledTimes(1);
        });

        it('should not update if data is the same', async () => {
            const now = new Date();
            const existing = [
                { id: '1', name: 'A', coordinates: '100|100', isAutoBuildEnabled: false, isAutoScavengingEnabled: false, createdAt: now, updatedAt: now },
            ];
            mockRepository.find.mockResolvedValue(existing);
            mockRepository.save.mockImplementation(async (v) => v);

            const input = [
                { id: '1', name: 'A', coordinates: '100|100' },
            ];

            const result = await service.syncVillages(input);
            expect(result).toEqual({ added: 0, updated: 0, deleted: 0, total: 1 });
            expect(mockRepository.save).toHaveBeenCalledTimes(1); // Zawsze save dla updatedAt
        });
    });
}); 