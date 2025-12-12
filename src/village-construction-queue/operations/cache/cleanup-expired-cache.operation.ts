import { CachedBuildingStates } from './cache-village-building-states.operation';

export interface CleanupExpiredCacheDependencies {
    buildingStatesCache: Map<string, CachedBuildingStates>;
    cacheTtl: number;
    logger: any;
}

/**
 * Czyści wygasłe wpisy z cache
 * @param deps Zależności potrzebne do wykonania operacji
 */
export function cleanupExpiredCacheOperation(
    deps: CleanupExpiredCacheDependencies
): void {
    const { buildingStatesCache, cacheTtl, logger } = deps;
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, cached] of buildingStatesCache.entries()) {
        const age = now.getTime() - cached.timestamp.getTime();
        if (age > cacheTtl) {
            buildingStatesCache.delete(key);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
}

