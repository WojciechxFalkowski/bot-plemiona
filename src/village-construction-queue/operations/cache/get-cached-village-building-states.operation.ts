import { CachedBuildingStates } from './cache-village-building-states.operation';

export interface GetCachedVillageBuildingStatesDependencies {
    buildingStatesCache: Map<string, CachedBuildingStates>;
    cacheTtl: number;
    logger: any;
}

/**
 * Pobiera stany budynków z cache
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns CachedBuildingStates jeśli cache istnieje i jest ważny, null w przeciwnym razie
 */
export function getCachedVillageBuildingStatesOperation(
    serverId: number,
    villageId: string,
    deps: GetCachedVillageBuildingStatesDependencies
): CachedBuildingStates | null {
    const { buildingStatesCache, cacheTtl, logger } = deps;
    const cacheKey = `${serverId}-${villageId}`;
    const cached = buildingStatesCache.get(cacheKey);

    if (!cached) {
        return null;
    }

    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();

    if (age > cacheTtl) {
        buildingStatesCache.delete(cacheKey);
        return null;
    }

    return cached;
}

