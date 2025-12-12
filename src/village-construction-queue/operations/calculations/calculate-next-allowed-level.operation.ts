import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { BuildingLevels } from '@/crawler/pages/village-overview.page';
import { getHighestLevelFromGameQueueOperation } from './get-highest-level-from-game-queue.operation';

export interface CalculateNextAllowedLevelDependencies {
    logger: any;
}

/**
 * Oblicza następny dozwolony poziom budynku na podstawie danych z gry i bazy
 * @param buildingId ID budynku
 * @param gameData Dane z gry (poziomy + kolejka budowy)
 * @param databaseQueue Kolejka budowy z bazy danych
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Następny dozwolony poziom
 */
export function calculateNextAllowedLevelOperation(
    buildingId: string,
    gameData: { buildingLevels: BuildingLevels, buildQueue: any[] },
    databaseQueue: VillageConstructionQueueEntity[],
    deps: CalculateNextAllowedLevelDependencies
): number {
    const { logger } = deps;
    
    // 1. Pobierz aktualny poziom z gry (buildingId jest teraz bezpośrednio kluczem w BuildingLevels)
    const gameLevel = (gameData.buildingLevels as any)[buildingId] || 0;

    // 2. Znajdź najwyższy poziom tego budynku w kolejce budowy gry
    const gameQueueLevel = getHighestLevelFromGameQueueOperation(buildingId, gameData.buildQueue);

    // 3. Znajdź najwyższy poziom tego budynku w naszej kolejce w bazie
    const databaseLevel = databaseQueue.length > 0
        ? Math.max(...databaseQueue.map(item => item.targetLevel))
        : 0;

    // 4. Oblicz następny dozwolony poziom
    const maxCurrentLevel = Math.max(gameLevel, gameQueueLevel, databaseLevel);
    const nextAllowedLevel = maxCurrentLevel + 1;

    logger.log(`Level calculation for ${buildingId}: game=${gameLevel}, gameQueue=${gameQueueLevel}, database=${databaseLevel} => next=${nextAllowedLevel}`);

    return nextAllowedLevel;
}

