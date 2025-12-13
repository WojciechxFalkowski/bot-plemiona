import { Browser } from 'playwright';
import { Logger } from '@nestjs/common';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { createBrowserPage } from '@/utils/browser.utils';
import { extractBarbarianVillagesFromGameOperation } from './extract-barbarian-villages-from-game.operation';
import { syncBarbarianVillagesOperation } from './sync-barbarian-villages.operation';
import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';

export interface RefreshBarbarianVillagesDependencies {
    serversService: ServersService;
    plemionaCookiesService: PlemionaCookiesService;
    credentials: PlemionaCredentials;
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

export interface RefreshResult {
    added: number;
    updated: number;
    deleted: number;
}

/**
 * Główna operacja odświeżania wiosek barbarzyńskich (orchestracja logowania, scrapowania, synchronizacji)
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik odświeżania z liczbami dodanych, zaktualizowanych i usuniętych wiosek
 */
export async function refreshBarbarianVillagesOperation(
    serverId: number,
    deps: RefreshBarbarianVillagesDependencies
): Promise<RefreshResult> {
    const { serversService, plemionaCookiesService, credentials, barbarianVillageRepository, logger } = deps;

    logger.log(`Starting barbarian villages refresh for server ${serverId}...`);

    const { browser, page } = await createBrowserPage({ headless: true });

    try {
        const serverName = await serversService.getServerName(serverId);
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            credentials,
            plemionaCookiesService,
            serverName
        );

        if (!loginResult.success || !loginResult.worldSelected) {
            throw new Error(`Login failed for server ${serverId}: ${loginResult.error || 'Unknown error'}`);
        }

        logger.log(`Successfully logged in for server ${serverId}, starting barbarian villages extraction...`);

        const barbarianVillagesData = await extractBarbarianVillagesFromGameOperation({
            page,
            logger
        });

        const syncResult = await syncBarbarianVillagesOperation(serverId, barbarianVillagesData, {
            barbarianVillageRepository,
            logger
        });

        logger.log(`Barbarian villages refresh completed for server ${serverId}: ${JSON.stringify(syncResult)}`);
        return syncResult;

    } finally {
        await browser.close();
    }
}


