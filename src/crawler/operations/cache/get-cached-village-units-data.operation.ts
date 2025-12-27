import { Logger } from '@nestjs/common';
import { CachedVillageUnitsData } from './cache-village-units-data.operation';

/**
 * Dependencies for getCachedVillageUnitsDataOperation
 */
export interface GetCachedVillageUnitsDataDependencies {
  villageUnitsCache: Map<number, CachedVillageUnitsData>;
  cacheTtl: number;
  logger: Logger;
}

/**
 * Gets village units data from cache if valid
 * 
 * @param serverId - Server ID
 * @param deps - Dependencies
 * @returns Cached data if valid, null otherwise
 */
export function getCachedVillageUnitsDataOperation(
  serverId: number,
  deps: GetCachedVillageUnitsDataDependencies
): CachedVillageUnitsData | null {
  const { villageUnitsCache, cacheTtl, logger } = deps;

  const cached = villageUnitsCache.get(serverId);

  if (!cached) {
    logger.debug(`No cache found for server ${serverId}`);
    return null;
  }

  const now = new Date();
  const cacheAge = now.getTime() - cached.cachedAt.getTime();

  if (cacheAge > cacheTtl) {
    logger.debug(`Cache expired for server ${serverId} (age: ${Math.round(cacheAge / 1000)}s, TTL: ${Math.round(cacheTtl / 1000)}s)`);
    villageUnitsCache.delete(serverId);
    return null;
  }

  logger.debug(`Using cached data for server ${serverId} (age: ${Math.round(cacheAge / 1000)}s)`);
  return cached;
}



