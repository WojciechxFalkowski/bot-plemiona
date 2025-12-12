import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { CachedBuildingStates } from '../cache/cache-village-building-states.operation';
import { getHighestLevelFromGameQueueOperation } from './get-highest-level-from-game-queue.operation';

export interface CalculateNextAllowedLevelFromCacheDependencies {
    logger: any;
}

/**
 * Oblicza następny dozwolony poziom budynku na podstawie danych z cache (bez Playwright)
 * @param buildingId ID budynku
 * @param cachedData Dane z cache (poziomy + kolejka budowy)
 * @param databaseQueue Kolejka budowy z bazy danych
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Następny dozwolony poziom
 */
export function calculateNextAllowedLevelFromCacheOperation(
    buildingId: string,
    cachedData: CachedBuildingStates,
    databaseQueue: VillageConstructionQueueEntity[],
    deps: CalculateNextAllowedLevelFromCacheDependencies
): number {
    const { logger } = deps;
    
    // 1. Pobierz aktualny poziom z cache
    const gameLevel = cachedData.buildingLevels[buildingId] || 0;

    // 2. Znajdź najwyższy poziom tego budynku w kolejce budowy gry z cache
    const gameQueueLevel = getHighestLevelFromGameQueueOperation(buildingId, cachedData.buildQueue);

    // 3. Znajdź najwyższy poziom tego budynku w naszej kolejce w bazie
    const databaseLevel = databaseQueue.length > 0
        ? Math.max(...databaseQueue.map(item => item.targetLevel))
        : 0;

    // 4. Oblicz następny dozwolony poziom
    const maxCurrentLevel = Math.max(gameLevel, gameQueueLevel, databaseLevel);
    const nextAllowedLevel = maxCurrentLevel + 1;

    logger.log(`Level calculation from cache for ${buildingId}: game=${gameLevel}, gameQueue=${gameQueueLevel}, database=${databaseLevel} => next=${nextAllowedLevel}`);

    return nextAllowedLevel;
}

