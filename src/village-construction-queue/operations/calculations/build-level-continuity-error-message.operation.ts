import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { BuildingLevels } from '@/crawler/pages/village-overview.page';
import { getCurrentGameLevelOperation } from './get-current-game-level.operation';

export interface BuildLevelContinuityErrorMessageDependencies {
    // No dependencies needed - pure function
}

/**
 * Buduje szczegółowy komunikat błędu dla walidacji ciągłości poziomów
 * @param buildingName Nazwa budynku
 * @param targetLevel Docelowy poziom
 * @param nextAllowedLevel Następny dozwolony poziom
 * @param gameData Dane z gry
 * @param databaseQueue Kolejka z bazy
 * @param deps Zależności potrzebne do wykonania operacji (opcjonalne, obecnie nie używane)
 * @returns Sformatowany komunikat błędu
 */
export function buildLevelContinuityErrorMessageOperation(
    buildingName: string,
    targetLevel: number,
    nextAllowedLevel: number,
    gameData: { buildingLevels: BuildingLevels, buildQueue: any[] },
    databaseQueue: VillageConstructionQueueEntity[],
    deps?: BuildLevelContinuityErrorMessageDependencies
): string {
    const gameLevel = getCurrentGameLevelOperation(buildingName, gameData.buildingLevels);
    const gameQueueCount = gameData.buildQueue.filter((item: any) => item.building === buildingName).length;
    const databaseCount = databaseQueue.length;

    return [
        `Cannot add ${buildingName} level ${targetLevel}.`,
        `Next allowed level is ${nextAllowedLevel}.`,
        `Current status:`,
        `- Game level: ${gameLevel}`,
        `- Game queue: ${gameQueueCount} items`,
        `- Database queue: ${databaseCount} items`,
        `Please add level ${nextAllowedLevel} instead.`
    ].join(' ');
}

