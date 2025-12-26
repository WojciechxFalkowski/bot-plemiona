import { Logger } from '@nestjs/common';
import { CachedVillageUnitsData } from './cache-village-units-data.operation';

/**
 * Dependencies for cleanupExpiredCacheOperation
 */
export interface CleanupExpiredCacheDependencies {
  villageUnitsCache: Map<number, CachedVillageUnitsData>;
  cacheTtl: number;
  logger: Logger;
}

/**
 * Removes expired entries from cache
 * 
 * @param deps - Dependencies
 */
export function cleanupExpiredCacheOperation(
  deps: CleanupExpiredCacheDependencies
): void {
  const { villageUnitsCache, cacheTtl, logger } = deps;

  const now = new Date();
  const expiredKeys: number[] = [];

  for (const [serverId, cached] of villageUnitsCache.entries()) {
    const cacheAge = now.getTime() - cached.cachedAt.getTime();
    
    if (cacheAge > cacheTtl) {
      expiredKeys.push(serverId);
    }
  }

  if (expiredKeys.length > 0) {
    expiredKeys.forEach(key => villageUnitsCache.delete(key));
    logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
  }
}

