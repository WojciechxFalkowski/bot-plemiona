import { NotFoundException } from '@nestjs/common';
import { VillageResponseDto } from '@/villages/dto';
import { BuildingLevels, BuildQueueItem } from '@/crawler/pages/village-overview.page';
import { VillagesService } from '@/villages/villages.service';
import { createBrowserSessionOperation, CreateBrowserSessionDependencies } from '../browser/create-browser-session.operation';
import { scrapeVillageBuildingDataOperation, ScrapeVillageBuildingDataDependencies } from './scrape-village-building-data.operation';
import { ServersService } from '@/servers';

export interface ScrapeVillageQueueDependencies {
    logger: any;
    villagesService: VillagesService;
    serversService: ServersService;
    createBrowserSessionDeps: CreateBrowserSessionDependencies;
    scrapeVillageBuildingDataDeps: ScrapeVillageBuildingDataDependencies;
}

/**
 * Scrapuje kolejkę budowy dla konkretnej wioski na podstawie nazwy
 * @param serverId ID serwera
 * @param villageName Nazwa wioski (np. "0001") 
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Dane o kolejce budowy dla danej wioski
 */
export async function scrapeVillageQueueOperation(
    serverId: number,
    villageName: string,
    deps: ScrapeVillageQueueDependencies
): Promise<{
    villageInfo: VillageResponseDto;
    buildingLevels: BuildingLevels;
    buildQueue: BuildQueueItem[];
}> {
    const { logger, villagesService, serversService, createBrowserSessionDeps, scrapeVillageBuildingDataDeps } = deps;

    logger.log(`Scraping queue for village: ${villageName}`);

    // Znajdź wioskę po nazwie
    const village = await villagesService.findByName(serverId, villageName);
    if (!village) {
        throw new NotFoundException(`Village with name "${villageName}" not found`);
    }

    const server = await serversService.findById(serverId);
    const serverCode = server.serverCode;

    const { browser, context, page } = await createBrowserSessionOperation(serverId, createBrowserSessionDeps);

    try {
        const villageResponseDto = villagesService.mapToResponseDto(village);
        const { buildingLevels, buildQueue } = await scrapeVillageBuildingDataOperation(serverId, serverCode, village.id, page, scrapeVillageBuildingDataDeps);

        logger.log(`Successfully scraped queue for village "${villageName}" (ID: ${village.id})`);

        return {
            villageInfo: villageResponseDto,
            buildingLevels,
            buildQueue
        };

    } finally {
        await browser.close();
    }
}

