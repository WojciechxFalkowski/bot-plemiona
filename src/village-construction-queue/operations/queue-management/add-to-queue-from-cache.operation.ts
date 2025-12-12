import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { CreateConstructionQueueDto } from '../../dto/create-construction-queue.dto';
import { VillagesService } from '@/villages/villages.service';
import { CachedBuildingStates } from '../cache/cache-village-building-states.operation';
import { getCachedVillageBuildingStatesOperation, GetCachedVillageBuildingStatesDependencies } from '../cache/get-cached-village-building-states.operation';
import { validateBuildingConfigOperation, ValidateBuildingConfigDependencies } from '../validation/validate-building-config.operation';
import { getDatabaseQueueOperation, GetDatabaseQueueDependencies } from './get-database-queue.operation';
import { calculateNextAllowedLevelFromCacheOperation, CalculateNextAllowedLevelFromCacheDependencies } from '../calculations/calculate-next-allowed-level-from-cache.operation';
import { getHighestLevelFromGameQueueOperation } from '../calculations/get-highest-level-from-game-queue.operation';
import { validateNoDuplicateInQueueOperation, ValidateNoDuplicateInQueueDependencies } from '../validation/validate-no-duplicate-in-queue.operation';
import { createQueueItemOperation, CreateQueueItemDependencies } from './create-queue-item.operation';
import { getQueueForVillageOperation, GetQueueForVillageDependencies } from './get-queue-for-village.operation';

export interface AddToQueueFromCacheDependencies {
    logger: any;
    villagesService: VillagesService;
    getCachedVillageBuildingStatesDeps: GetCachedVillageBuildingStatesDependencies;
    validateBuildingConfigDeps: ValidateBuildingConfigDependencies;
    getDatabaseQueueDeps: GetDatabaseQueueDependencies;
    calculateNextAllowedLevelFromCacheDeps: CalculateNextAllowedLevelFromCacheDependencies;
    validateNoDuplicateInQueueDeps: ValidateNoDuplicateInQueueDependencies;
    createQueueItemDeps: CreateQueueItemDependencies;
    getQueueForVillageDeps: GetQueueForVillageDependencies;
}

/**
 * Dodaje budynek do kolejki budowy używając danych z cache (bez Playwright)
 * @param serverId ID serwera
 * @param villageName Nazwa wioski
 * @param buildingId ID budynku
 * @param targetLevel Opcjonalny docelowy poziom (jeśli nie podany, oblicza automatycznie)
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Obiekt zawierający utworzony wpis i pełną kolejkę z bazy dla wioski
 */
export async function addToQueueFromCacheOperation(
    serverId: number,
    villageName: string,
    buildingId: string,
    targetLevel: number | undefined,
    deps: AddToQueueFromCacheDependencies
): Promise<{
    queueItem: VillageConstructionQueueEntity;
    databaseQueue: VillageConstructionQueueEntity[];
}> {
    const {
        logger,
        villagesService,
        getCachedVillageBuildingStatesDeps,
        validateBuildingConfigDeps,
        getDatabaseQueueDeps,
        calculateNextAllowedLevelFromCacheDeps,
        validateNoDuplicateInQueueDeps,
        createQueueItemDeps,
        getQueueForVillageDeps
    } = deps;

    logger.log(`Adding building to queue from cache: ${buildingId} level ${targetLevel || 'auto'} for village ${villageName}`);

    // 1. Znajdź wioskę po nazwie
    const village = await villagesService.findByName(serverId, villageName);
    if (!village) {
        throw new NotFoundException(`Village with name "${villageName}" not found`);
    }

    // 2. Pobierz dane z cache dla wioski
    const cachedData = getCachedVillageBuildingStatesOperation(serverId, village.id, getCachedVillageBuildingStatesDeps);
    if (!cachedData) {
        throw new BadRequestException(
            `Cache not available for village "${villageName}". Please fetch building states first.`
        );
    }

    // 3. Sprawdź czy budynek istnieje w konfiguracji
    const buildingConfig = await validateBuildingConfigOperation(buildingId, targetLevel || 30, validateBuildingConfigDeps);

    // 4. Pobierz kolejkę z bazy danych dla tego budynku
    const databaseQueue = await getDatabaseQueueOperation(serverId, village.id, buildingId, getDatabaseQueueDeps);

    // 5. Oblicz następny dozwolony poziom
    const nextAllowedLevel = calculateNextAllowedLevelFromCacheOperation(buildingId, cachedData, databaseQueue, calculateNextAllowedLevelFromCacheDeps);

    // 6. Jeśli targetLevel jest podany, sprawdź czy jest poprawny
    const finalTargetLevel = targetLevel ?? nextAllowedLevel;
    if (targetLevel !== undefined && targetLevel !== nextAllowedLevel) {
        const gameQueueMax = getHighestLevelFromGameQueueOperation(buildingId, cachedData.buildQueue);
        const databaseQueueMax = databaseQueue.length > 0 ? Math.max(...databaseQueue.map(item => item.targetLevel)) : 0;
        throw new BadRequestException(
            `Invalid target level ${targetLevel}. Next allowed level is ${nextAllowedLevel}. ` +
            `Current status: game level=${cachedData.buildingLevels[buildingId] || 0}, ` +
            `game queue max=${gameQueueMax}, ` +
            `database queue max=${databaseQueueMax}`
        );
    }

    // 7. Walidacja podstawowa (duplikaty, maxLevel)
    if (finalTargetLevel > buildingConfig.maxLevel) {
        throw new BadRequestException(
            `Target level ${finalTargetLevel} exceeds maximum level ${buildingConfig.maxLevel} for building '${buildingConfig.name}'`
        );
    }

    await validateNoDuplicateInQueueOperation(village.id, buildingId, finalTargetLevel, buildingConfig.name, validateNoDuplicateInQueueDeps);

    // 8. Utwórz DTO i zapisz do bazy danych
    const dto: CreateConstructionQueueDto = {
        villageId: village.id,
        buildingId: buildingId,
        targetLevel: finalTargetLevel,
        serverId: serverId
    };

    const queueItem = await createQueueItemOperation(dto, buildingConfig, village, createQueueItemDeps);

    // 9. Pobierz pełną kolejkę z bazy dla wioski
    const fullDatabaseQueue = await getQueueForVillageOperation(village.id, getQueueForVillageDeps);

    return {
        queueItem,
        databaseQueue: fullDatabaseQueue
    };
}

