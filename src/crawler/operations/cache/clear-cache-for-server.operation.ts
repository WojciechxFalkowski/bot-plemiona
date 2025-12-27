import { Logger } from '@nestjs/common';
import { CachedVillageUnitsData } from './cache-village-units-data.operation';

/**
 * Dependencies for clearCacheForServerOperation
 */
export interface ClearCacheForServerDependencies {
  villageUnitsCache: Map<number, CachedVillageUnitsData>;
  logger: Logger;
}

/**
 * Removes cache for a specific server
 * 
 * @param serverId - Server ID
 * @param deps - Dependencies
 */
export function clearCacheForServerOperation(
  serverId: number,
  deps: ClearCacheForServerDependencies
): void {
  const { villageUnitsCache, logger } = deps;

  const deleted = villageUnitsCache.delete(serverId);
  
  if (deleted) {
    logger.log(`Cleared cache for server ${serverId}`);
  } else {
    logger.debug(`No cache found to clear for server ${serverId}`);
  }
}



