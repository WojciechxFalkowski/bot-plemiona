import { getBuildingConfig } from '@/crawler/pages/village-detail.page';
import { BuildQueueItem } from '@/crawler/pages/village-overview.page';

export interface IsTargetLevelInGameQueueDependencies {
    // No dependencies needed - pure function
}

/**
 * Sprawdza czy target level jest już w kolejce gry
 * @param buildingId ID budynku
 * @param targetLevel Docelowy poziom
 * @param gameQueue Kolejka budowy z gry
 * @param deps Zależności potrzebne do wykonania operacji (opcjonalne, obecnie nie używane)
 * @returns True jeśli target level jest w kolejce gry, false w przeciwnym przypadku
 */
export function isTargetLevelInGameQueueOperation(
    buildingId: string,
    targetLevel: number,
    gameQueue: BuildQueueItem[],
    deps?: IsTargetLevelInGameQueueDependencies
): boolean {
    const buildingConfig = getBuildingConfig(buildingId);
    if (!buildingConfig) {
        return false;
    }

    for (const queueItem of gameQueue) {
        if (queueItem.building === buildingConfig.name && queueItem.level === targetLevel) {
            return true;
        }
    }
    return false;
}

