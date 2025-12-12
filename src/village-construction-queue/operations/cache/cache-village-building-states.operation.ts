import { BuildingLevels, BuildQueueItem } from '@/crawler/pages/village-overview.page';

export interface CachedBuildingStates {
    buildingLevels: BuildingLevels;
    buildQueue: BuildQueueItem[];
    timestamp: Date;
}

export interface CacheVillageBuildingStatesDependencies {
    buildingStatesCache: Map<string, CachedBuildingStates>;
    logger: any;
}

/**
 * Zapisuje stany budynków do cache
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param buildingLevels Poziomy budynków
 * @param buildQueue Kolejka budowy
 * @param deps Zależności potrzebne do wykonania operacji
 */
export function cacheVillageBuildingStatesOperation(
    serverId: number,
    villageId: string,
    buildingLevels: BuildingLevels,
    buildQueue: BuildQueueItem[],
    deps: CacheVillageBuildingStatesDependencies
): void {
    const { buildingStatesCache, logger } = deps;
    const cacheKey = `${serverId}-${villageId}`;
    buildingStatesCache.set(cacheKey, {
        buildingLevels,
        buildQueue,
        timestamp: new Date()
    });
    logger.debug(`Cached building states for village ${villageId} on server ${serverId}`);
}

