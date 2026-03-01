import { Browser } from 'playwright';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { getOldestBuildingPerVillageOperation, GetOldestBuildingPerVillageDependencies } from './get-oldest-building-per-village.operation';
import { createBrowserSessionOperation, CreateBrowserSessionDependencies } from '../browser/create-browser-session.operation';
import { processSingleBuildingOperation, ProcessSingleBuildingDependencies } from './process-single-building.operation';
import { scrapeVillageBuildingDataOperation, ScrapeVillageBuildingDataDependencies } from '../scraping/scrape-village-building-data.operation';
import { ServersService } from '@/servers';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';

export interface ConstructionQueueActivityContext {
    executionLogId: number | null;
    serverId: number;
    logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>;
}

export interface ProcessAndCheckConstructionQueueDependencies {
    logger: any;
    serversService: ServersService;
    getOldestBuildingPerVillageDeps: GetOldestBuildingPerVillageDependencies;
    createBrowserSessionDeps: CreateBrowserSessionDependencies;
    processSingleBuildingDeps: ProcessSingleBuildingDependencies;
    scrapeVillageBuildingDataDeps: ScrapeVillageBuildingDataDependencies;
    activityContext?: ConstructionQueueActivityContext;
}

/**
 * Przetwarza kolejkę budowy:
 * 1. Pobiera najstarsze wpisy z bazy danych (FIFO)
 * 2. Grupuje według wiosek
 * 3. Dla każdej wioski używa scrappera do sprawdzenia czy można budować
 * 4. Loguje informacje o możliwych budowach
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function processAndCheckConstructionQueueOperation(
    serverId: number,
    deps: ProcessAndCheckConstructionQueueDependencies
): Promise<void> {
    const {
        logger,
        serversService,
        getOldestBuildingPerVillageDeps,
        createBrowserSessionDeps,
        processSingleBuildingDeps,
        scrapeVillageBuildingDataDeps,
        activityContext
    } = deps;

    logger.log('🔄 Processing construction queue from database...');

    try {
        const serverCode = await serversService.findById(serverId).then(server => server.serverCode);
        // 1. Pobierz najstarsze budynki per wioska (FIFO)
        const buildingsToProcess = await getOldestBuildingPerVillageOperation(getOldestBuildingPerVillageDeps);

        if (buildingsToProcess.length === 0) {
            logger.log('✅ No buildings in queue - waiting for next interval');
            return;
        }

        logger.log(`📋 Found ${buildingsToProcess.length} buildings to process across ${new Set(buildingsToProcess.map(b => b.villageId)).size} villages`);

        // 2. Zaloguj się do gry (jedna sesja dla całego batch'a)
        logger.log('🔐 Creating browser session and logging in...');
        const { browser, context, page } = await createBrowserSessionOperation(serverId, createBrowserSessionDeps);

        try {
            // 3. Przetworz każdy budynek sekwencyjnie
            let processedCount = 0;
            let successCount = 0;
            let errorCount = 0;

            // Group buildings by village to update cache after processing each village
            const buildingsByVillage = new Map<string, VillageConstructionQueueEntity[]>();
            for (const building of buildingsToProcess) {
                const villageId = building.villageId;
                if (!buildingsByVillage.has(villageId)) {
                    buildingsByVillage.set(villageId, []);
                }
                buildingsByVillage.get(villageId)!.push(building);
            }

            // Process buildings grouped by village
            for (const [villageId, villageBuildings] of buildingsByVillage.entries()) {
                let villageProcessed = false;
                
                for (const building of villageBuildings) {
                    processedCount++;
                    logger.log(`🏘️  Processing village ${building.village?.name || building.villageId} (${processedCount}/${buildingsToProcess.length}): ${building.buildingName} Level ${building.targetLevel}`);

                    try {
                        const result = await processSingleBuildingOperation(serverCode, building, page, processSingleBuildingDeps);
                        if (result.success) {
                            successCount++;
                            const villageName = building.village?.name || building.villageId;
                            if (result.reason === 'Already built') {
                                await activityContext?.logActivity({
                                    eventType: CrawlerActivityEventType.SUCCESS,
                                    message: `Zbudowano: ${building.buildingName} (poziom ${building.targetLevel}) w ${villageName}`,
                                });
                            } else if (result.reason === 'Successfully added') {
                                await activityContext?.logActivity({
                                    eventType: CrawlerActivityEventType.INFO,
                                    message: `Rozpoczęto budowę: ${building.buildingName} (poziom ${building.targetLevel}) w ${villageName}`,
                                });
                            } else if (result.reason === 'Already in game queue') {
                                await activityContext?.logActivity({
                                    eventType: CrawlerActivityEventType.INFO,
                                    message: `W kolejce budowy: ${building.buildingName} (poziom ${building.targetLevel}) w ${villageName}`,
                                });
                            }
                        } else {
                            const villageName = building.village?.name || building.villageId;
                            await activityContext?.logActivity({
                                eventType: CrawlerActivityEventType.ERROR,
                                message: `Nie udało się zbudować ${building.buildingName} (poziom ${building.targetLevel}) w ${villageName} – ${result.reason}`,
                            });
                        }
                        villageProcessed = true;
                    } catch (error) {
                        errorCount++;
                        const villageName = building.village?.name || building.villageId;
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        logger.error(`❌ Error processing building ${building.buildingName} L${building.targetLevel} in village ${building.villageId}:`, error);
                        await activityContext?.logActivity({
                            eventType: CrawlerActivityEventType.ERROR,
                            message: `Błąd przy budowie ${building.buildingName} (poziom ${building.targetLevel}) w ${villageName}: ${errorMsg}`,
                        });
                    }
                }

                // Update cache after processing all buildings for this village
                if (villageProcessed) {
                    try {
                        const { buildingLevels, buildQueue } = await scrapeVillageBuildingDataOperation(serverId, serverCode, villageId, page, scrapeVillageBuildingDataDeps);
                        logger.debug(`Updated cache for village ${villageId} after processing`);
                    } catch (error) {
                        logger.warn(`Failed to update cache for village ${villageId}:`, error);
                        // Don't fail the whole process if cache update fails
                    }
                }
            }

            logger.log(`📊 Processing complete: ${successCount} successful, ${errorCount} errors, ${processedCount} total`);

        } finally {
            // 4. Zawsze zamykaj przeglądarkę
            await browser.close();
            logger.log('🔒 Browser session closed');
        }

    } catch (error) {
        logger.error('❌ Critical error during construction queue processing:', error);
        logger.log('⏰ Will retry at next scheduled interval');
        const errorMsg = error instanceof Error ? error.message : String(error);
        await activityContext?.logActivity({
            eventType: CrawlerActivityEventType.ERROR,
            message: `Krytyczny błąd przetwarzania kolejki budowy: ${errorMsg}`,
        });
    }

    logger.log('✅ Construction queue processing finished. Next execution scheduled.');
}

