import { Logger } from '@nestjs/common';
import { CrawlerService } from '@/crawler/crawler.service';

export interface TriggerScavengingForVillageDependencies {
  crawlerService: CrawlerService;
  logger: Logger;
}

/**
 * Ręcznie wyzwala zbieractwo dla konkretnej wioski
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik wyzwolenia zbieractwa z informacją o liczbie wysłanych jednostek
 */
export async function triggerScavengingForVillageOperation(
  serverId: number,
  villageId: string,
  deps: TriggerScavengingForVillageDependencies,
): Promise<{ success: boolean; message: string; dispatchedCount: number }> {
  const { crawlerService, logger } = deps;

  logger.log(`Manual scavenging trigger requested for village ${villageId} on server ${serverId}`);
  return await crawlerService.performScavengingForVillage(serverId, villageId);
}


