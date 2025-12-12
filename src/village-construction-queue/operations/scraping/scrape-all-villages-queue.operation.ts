import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '@/villages/entities/village.entity';
import { VillageResponseDto } from '@/villages/dto';
import { BuildingLevels, BuildQueueItem } from '@/crawler/pages/village-overview.page';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { VillagesService } from '@/villages/villages.service';
import { createBrowserPage } from '@/utils/browser.utils';
import { scrapeVillageBuildingDataOperation, ScrapeVillageBuildingDataDependencies } from './scrape-village-building-data.operation';

export interface ScrapeAllVillagesQueueDependencies {
    logger: any;
    villageRepository: Repository<VillageEntity>;
    villagesService: VillagesService;
    serversService: ServersService;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    scrapeVillageBuildingDataDeps: ScrapeVillageBuildingDataDependencies;
}

/**
 * Scrapuje kolejkę budowy dla wszystkich wiosek
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Dane o kolejce budowy dla wszystkich wiosek
 */
export async function scrapeAllVillagesQueueOperation(
    serverId: number,
    deps: ScrapeAllVillagesQueueDependencies
): Promise<{
    villageInfo: VillageResponseDto;
    buildingLevels: BuildingLevels;
    buildQueue: BuildQueueItem[];
}[]> {
    const { 
        logger, 
        villageRepository, 
        villagesService, 
        serversService, 
        credentials, 
        plemionaCookiesService,
        scrapeVillageBuildingDataDeps 
    } = deps;

    const { browser, context, page } = await createBrowserPage({ headless: true });
    const server = await serversService.findById(serverId);
    const serverCode = server.serverCode;
    const serverName = server.serverName;

    try {
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            credentials,
            plemionaCookiesService,
            serverName
        );
        if (!loginResult.success || !loginResult.worldSelected) {
            await browser.close();
            throw new BadRequestException(`Login failed: ${loginResult.error || 'Unknown error'}`);
        }

        const villages = await villageRepository.find();
        const data: {
            villageInfo: VillageResponseDto;
            buildingLevels: BuildingLevels;
            buildQueue: BuildQueueItem[];
        }[] = [];
        
        for (const village of villages) {
            const villageResponseDto = villagesService.mapToResponseDto(village);
            const { buildingLevels, buildQueue } = await scrapeVillageBuildingDataOperation(serverId, serverCode, village.id, page, scrapeVillageBuildingDataDeps);
            data.push({ villageInfo: villageResponseDto, buildingLevels, buildQueue });
        }
        
        return data;
    } finally {
        await browser.close();
    }
}

