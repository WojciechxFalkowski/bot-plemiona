import { ServersService } from '@/servers';
import { VillagesSyncResult } from '../../contracts/villages.contract';
import { syncVillagesOperation, SyncVillagesDependencies } from './sync-villages.operation';
import { getOverviewVillageInformationOperation, GetOverviewVillageInformationDependencies } from '../scraping/get-overview-village-information.operation';

export interface RefreshVillageDataDependencies {
    logger: any;
    serversService: ServersService;
    syncVillagesDeps: SyncVillagesDependencies;
    getOverviewVillageInformationDeps: GetOverviewVillageInformationDependencies;
}

/**
 * Odświeża dane wiosek (scraping + sync)
 * Pobiera dane z gry i synchronizuje je z bazą danych
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik synchronizacji
 */
export async function refreshVillageDataOperation(
    serverId: number,
    deps: RefreshVillageDataDependencies
): Promise<VillagesSyncResult> {
    const { logger, syncVillagesDeps, getOverviewVillageInformationDeps } = deps;
    
    logger.log(`Starting village data refresh for server ${serverId}...`);

    const villageData = await getOverviewVillageInformationOperation(serverId, {
        headless: true,
        timeoutPerPage: 15000,
        saveToDatabase: true
    }, getOverviewVillageInformationDeps);
    
    logger.log(`Extracted ${villageData.length} villages from server ${serverId}`);

    // Sync villages with database
    const syncResult = await syncVillagesOperation(serverId, villageData, syncVillagesDeps);

    logger.log(`Village data refresh completed for server ${serverId}: ${JSON.stringify(syncResult)}`);
    return syncResult;
}

