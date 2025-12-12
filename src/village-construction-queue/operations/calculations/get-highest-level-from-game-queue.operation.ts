import { getBuildingConfig } from '@/crawler/pages/village-detail.page';
import { BuildQueueItem } from '@/crawler/pages/village-overview.page';

export interface GetHighestLevelFromGameQueueDependencies {
    // No dependencies needed - pure function
}

/**
 * Znajduje najwyższy poziom określonego budynku w kolejce budowy gry
 * @param buildingId ID budynku
 * @param gameQueue Kolejka budowy z gry
 * @param deps Zależności potrzebne do wykonania operacji (opcjonalne, obecnie nie używane)
 * @returns Najwyższy poziom lub 0 jeśli nie znaleziono
 */
export function getHighestLevelFromGameQueueOperation(
    buildingId: string,
    gameQueue: BuildQueueItem[],
    deps?: GetHighestLevelFromGameQueueDependencies
): number {
    const buildingConfig = getBuildingConfig(buildingId);
    if (!buildingConfig) {
        return 0;
    }

    let highestLevel = 0;

    for (const queueItem of gameQueue) {
        // Porównujemy nazwy budynków (kolejka z gry zawiera nazwy, nie ID)
        if (queueItem.building.toLowerCase() === buildingConfig.name.toLowerCase()) {
            highestLevel = Math.max(highestLevel, queueItem.level || 0);
        }
    }

    return highestLevel;
}

