import { NotFoundException } from '@nestjs/common';
import { BuildingLevels, BuildQueueItem } from '@/crawler/pages/village-overview.page';
import { TRIBAL_WARS_BUILDINGS } from '@/crawler/pages/village-detail.page';
import { VillageResponseDto } from '@/villages/dto';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { VillagesService } from '@/villages/villages.service';
import { getQueueForVillageOperation, GetQueueForVillageDependencies } from './get-queue-for-village.operation';
import { getCachedVillageBuildingStatesOperation, GetCachedVillageBuildingStatesDependencies } from '../cache/get-cached-village-building-states.operation';
import { scrapeVillageQueueOperation, ScrapeVillageQueueDependencies } from '../scraping/scrape-village-queue.operation';

export interface GetBuildingStatesDependencies {
    logger: any;
    villagesService: VillagesService;
    getQueueForVillageDeps: GetQueueForVillageDependencies;
    getCachedVillageBuildingStatesDeps: GetCachedVillageBuildingStatesDependencies;
    scrapeVillageQueueDeps: ScrapeVillageQueueDependencies;
}

/**
 * Pobiera stany budynków dla wioski z cache wraz z maxLevels i kolejką z bazy danych
 * Jeśli cache nie istnieje, wykonuje zapytanie do gry (Playwright)
 * @param serverId ID serwera
 * @param villageName Nazwa wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Dane o stanach budynków
 */
export async function getBuildingStatesOperation(
    serverId: number,
    villageName: string,
    deps: GetBuildingStatesDependencies
): Promise<{
    villageInfo: VillageResponseDto;
    buildingLevels: BuildingLevels;
    buildQueue: BuildQueueItem[];
    databaseQueue: VillageConstructionQueueEntity[];
    cachedAt: Date;
    isValid: boolean;
    maxLevels: Record<string, number>;
}> {
    const { logger, villagesService, getQueueForVillageDeps, getCachedVillageBuildingStatesDeps, scrapeVillageQueueDeps } = deps;

    const village = await villagesService.findByName(serverId, villageName);
    if (!village) {
        throw new NotFoundException(`Village with name "${villageName}" not found`);
    }

    // Build maxLevels map from TRIBAL_WARS_BUILDINGS
    const maxLevels: Record<string, number> = {};
    for (const [key, config] of Object.entries(TRIBAL_WARS_BUILDINGS)) {
        maxLevels[config.id] = config.maxLevel;
    }

    // Pobierz kolejkę z bazy danych dla wioski
    const databaseQueue = await getQueueForVillageOperation(village.id, getQueueForVillageDeps);

    // Sprawdź cache
    let cached = getCachedVillageBuildingStatesOperation(serverId, village.id, getCachedVillageBuildingStatesDeps);
    
    // Jeśli cache nie istnieje, wykonaj zapytanie do gry
    if (!cached) {
        logger.log(`Cache not found for village "${villageName}", scraping from game...`);
        const scrapedData = await scrapeVillageQueueOperation(serverId, villageName, scrapeVillageQueueDeps);
        
        // Pobierz dane z cache (zostały zaktualizowane przez scrapeVillageQueue)
        cached = getCachedVillageBuildingStatesOperation(serverId, village.id, getCachedVillageBuildingStatesDeps);
        
        if (!cached) {
            // Jeśli nadal nie ma cache, użyj danych z scrapowania
            logger.warn(`Cache still not available after scraping, using fresh data`);
            return {
                villageInfo: scrapedData.villageInfo,
                buildingLevels: scrapedData.buildingLevels,
                buildQueue: scrapedData.buildQueue,
                databaseQueue: databaseQueue,
                cachedAt: new Date(),
                isValid: true,
                maxLevels
            };
        }
    }

    const villageResponseDto = villagesService.mapToResponseDto(village);

    return {
        villageInfo: villageResponseDto,
        buildingLevels: cached.buildingLevels,
        buildQueue: cached.buildQueue,
        databaseQueue: databaseQueue,
        cachedAt: cached.timestamp,
        isValid: true,
        maxLevels
    };
}

