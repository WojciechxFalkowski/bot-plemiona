import { Page } from 'playwright';
import { VillageDetailPage } from '@/crawler/pages/village-detail.page';
import { BuildingLevels, BuildQueueItem } from '@/crawler/pages/village-overview.page';
import { cacheVillageBuildingStatesOperation, CacheVillageBuildingStatesDependencies } from '../cache/cache-village-building-states.operation';

export interface ScrapeVillageBuildingDataDependencies {
    logger: any;
    cacheVillageBuildingStatesDeps: CacheVillageBuildingStatesDependencies;
}

export interface ScrapedVillageData {
    buildingLevels: BuildingLevels;
    buildQueue: BuildQueueItem[];
}

/**
 * Pobiera dane z gry dla określonej wioski
 * @param serverId ID serwera
 * @param serverCode Kod serwera
 * @param villageId ID wioski
 * @param page Strona przeglądarki
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Dane z gry (poziomy budynków i kolejka budowy)
 */
export async function scrapeVillageBuildingDataOperation(
    serverId: number,
    serverCode: string,
    villageId: string,
    page: Page,
    deps: ScrapeVillageBuildingDataDependencies
): Promise<ScrapedVillageData> {
    const { logger, cacheVillageBuildingStatesDeps } = deps;
    const villageDetailPage = new VillageDetailPage(page);
    await villageDetailPage.navigateToVillage(serverCode, villageId);

    // Pobierz poziomy budynków z gry
    const buildingLevels = await villageDetailPage.extractBuildingLevels(serverCode);

    // Pobierz aktualną kolejkę budowy z gry
    const buildQueue = await villageDetailPage.extractBuildQueue(serverCode);

    // Cache the scraped data
    cacheVillageBuildingStatesOperation(serverId, villageId, buildingLevels, buildQueue, cacheVillageBuildingStatesDeps);

    logger.log(`Scraped game data for village ${villageId}: ${Object.keys(buildingLevels).length} buildings, ${buildQueue.length} items in game queue`);

    return {
        buildingLevels,
        buildQueue
    };
}

