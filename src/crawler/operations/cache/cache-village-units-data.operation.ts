import { Logger } from '@nestjs/common';
import { VillageUnitsData } from '../../pages/village-units-overview.page';

/**
 * Cached data structure for village units
 */
export interface CachedVillageUnitsData {
  data: VillageUnitsData[];
  cachedAt: Date;
}

/**
 * Dependencies for cacheVillageUnitsDataOperation
 */
export interface CacheVillageUnitsDataDependencies {
  villageUnitsCache: Map<number, CachedVillageUnitsData>;
  logger: Logger;
}

/**
 * Saves village units data to cache
 * 
 * @param serverId - Server ID
 * @param data - Village units data
 * @param deps - Dependencies
 */
export function cacheVillageUnitsDataOperation(
  serverId: number,
  data: VillageUnitsData[],
  deps: CacheVillageUnitsDataDependencies
): void {
  const { villageUnitsCache, logger } = deps;

  const cachedData: CachedVillageUnitsData = {
    data,
    cachedAt: new Date()
  };

  villageUnitsCache.set(serverId, cachedData);
  
  logger.log(`Cached village units data for server ${serverId} (${data.length} villages)`);
}



