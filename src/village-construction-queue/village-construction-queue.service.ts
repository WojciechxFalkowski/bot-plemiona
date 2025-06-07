import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from './entities/village-construction-queue.entity';
import { VillageEntity } from '../villages/villages.entity';
import { CreateConstructionQueueDto } from './dto/create-construction-queue.dto';
import { VillageDetailPage, getBuildingConfig, areBuildingRequirementsMet, TRIBAL_WARS_BUILDINGS } from '../crawler/pages/village-detail.page';
import { Page } from 'playwright';
import { VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY } from './village-construction-queue.service.contracts';
import { VILLAGES_ENTITY_REPOSITORY } from '../villages/villages.service.contracts';

@Injectable()
export class VillageConstructionQueueService {
    private readonly logger = new Logger(VillageConstructionQueueService.name);

    constructor(
        @Inject(VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY)
        private readonly queueRepository: Repository<VillageConstructionQueueEntity>,
        @Inject(VILLAGES_ENTITY_REPOSITORY)
        private readonly villageRepository: Repository<VillageEntity>,
    ) { }

    async addToQueue(dto: CreateConstructionQueueDto): Promise<VillageConstructionQueueEntity> {
        this.logger.log(`Adding building to queue: ${dto.buildingId} level ${dto.targetLevel} for village ${dto.villageId}`);

        // 1. Sprawdź czy wioska istnieje
        const village = await this.villageRepository.findOne({
            where: { id: dto.villageId }
        });

        if (!village) {
            this.logger.error(`Village ${dto.villageId} not found`);
            throw new NotFoundException(`Village with ID ${dto.villageId} not found`);
        }

        // 2. Sprawdź czy budynek istnieje w konfiguracji
        const buildingConfig = getBuildingConfig(dto.buildingId);
        if (!buildingConfig) {
            this.logger.error(`Building ${dto.buildingId} not found in configuration`);
            throw new BadRequestException(`Building '${dto.buildingId}' is not a valid building ID`);
        }

        // 3. Sprawdź czy targetLevel nie przekracza maksymalnego poziomu
        if (dto.targetLevel > buildingConfig.maxLevel) {
            this.logger.error(`Target level ${dto.targetLevel} exceeds max level ${buildingConfig.maxLevel} for building ${dto.buildingId}`);
            throw new BadRequestException(
                `Target level ${dto.targetLevel} exceeds maximum level ${buildingConfig.maxLevel} for building '${buildingConfig.name}'`
            );
        }

        // 4. Sprawdź czy nie ma już takiego samego wpisu w kolejce
        const existingQueueItem = await this.queueRepository.findOne({
            where: {
                villageId: dto.villageId,
                buildingId: dto.buildingId,
                targetLevel: dto.targetLevel
            }
        });

        if (existingQueueItem) {
            this.logger.error(`Duplicate queue item: ${dto.buildingId} level ${dto.targetLevel} already exists for village ${dto.villageId}`);
            throw new ConflictException(
                `Building '${buildingConfig.name}' level ${dto.targetLevel} is already in queue for village ${dto.villageId}`
            );
        }

        // 5. Walidacja z użyciem village-detail.page.ts (opcjonalna - wymaga browser session)
        // Na razie pomijamy tę walidację, bo wymaga działającego browser session
        // W przyszłości można dodać sprawdzenie aktualnego poziomu budynku

        // TODO: Dodać walidację przez VillageDetailPage gdy będzie dostępna browser session:
        // await this.validateBuildingWithVillageDetail(dto.villageId, dto.buildingId, dto.targetLevel);

        // 6. Sprawdź czy targetLevel jest o 1 wyższy niż jakiś istniejący w kolejce dla tego budynku
        // Lub czy to jest poziom 1 (pierwszy budynek)
        if (dto.targetLevel > 1) {
            const previousLevelInQueue = await this.queueRepository.findOne({
                where: {
                    villageId: dto.villageId,
                    buildingId: dto.buildingId,
                    targetLevel: dto.targetLevel - 1
                }
            });

            // Jeśli nie ma poprzedniego poziomu w kolejce, to znaczy że próbujemy dodać poziom który jest za wysoki
            // (chyba że budynek już jest wybudowany - ale to sprawdzimy później przez browser session)
            if (!previousLevelInQueue && dto.targetLevel > 1) {
                this.logger.warn(`Target level ${dto.targetLevel} for ${dto.buildingId} might be too high - previous level not in queue`);
                // Na razie tylko logujemy warning, nie blokujemy - dopiero browser session powie nam prawdę
            }
        }

        // 7. Utwórz nowy wpis w kolejce
        const queueItem = this.queueRepository.create({
            villageId: dto.villageId,
            buildingId: dto.buildingId,
            buildingName: buildingConfig.name,
            targetLevel: dto.targetLevel,
            village: village
        });

        const savedItem = await this.queueRepository.save(queueItem);
        this.logger.log(`Successfully added ${buildingConfig.name} level ${dto.targetLevel} to queue for village ${dto.villageId}`);

        return savedItem;
    }

    /**
     * Walidacja z użyciem VillageDetailPage - wymaga browser session
     * TODO: Zaimplementować gdy będzie dostępna browser session
     */
    private async validateBuildingWithVillageDetail(
        villageId: string,
        buildingId: string,
        targetLevel: number,
        page?: Page
    ): Promise<void> {
        if (!page) {
            this.logger.warn('Browser page not available - skipping detailed validation');
            return;
        }

        try {
            const villageDetailPage = new VillageDetailPage(page);
            await villageDetailPage.navigateToVillage(villageId);

            // Sprawdź aktualny poziom budynku
            const currentLevel = await villageDetailPage.getBuildingLevel(buildingId);

            // Sprawdź czy targetLevel jest dokładnie o 1 wyższy niż aktualny
            if (targetLevel !== currentLevel + 1) {
                throw new BadRequestException(
                    `Target level ${targetLevel} is not exactly one level higher than current level ${currentLevel} for building ${buildingId}`
                );
            }

            // Sprawdź wymagania budynku
            const requirementsCheck = await villageDetailPage.checkBuildingRequirements(buildingId);
            if (!requirementsCheck.met) {
                const missingReqs = requirementsCheck.missingRequirements
                    .map(req => `${req.buildingId} level ${req.level}`)
                    .join(', ');

                throw new BadRequestException(
                    `Building requirements not met for ${buildingId}. Missing: ${missingReqs}`
                );
            }

        } catch (error) {
            this.logger.error(`Validation error for village ${villageId}, building ${buildingId}:`, error);
            throw error;
        }
    }
} 