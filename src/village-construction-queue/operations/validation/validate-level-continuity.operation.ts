import { BadRequestException } from '@nestjs/common';
import { Page } from 'playwright';
import { scrapeVillageBuildingDataOperation, ScrapeVillageBuildingDataDependencies } from '../scraping/scrape-village-building-data.operation';
import { getDatabaseQueueOperation, GetDatabaseQueueDependencies } from '../queue-management/get-database-queue.operation';
import { calculateNextAllowedLevelOperation, CalculateNextAllowedLevelDependencies } from '../calculations/calculate-next-allowed-level.operation';
import { buildLevelContinuityErrorMessageOperation } from '../calculations/build-level-continuity-error-message.operation';
import { ServersService } from '@/servers';

export interface ValidateLevelContinuityDependencies {
    serversService: ServersService;
    logger: any;
    scrapeVillageBuildingDataDeps: ScrapeVillageBuildingDataDependencies;
    getDatabaseQueueDeps: GetDatabaseQueueDependencies;
    calculateNextAllowedLevelDeps: CalculateNextAllowedLevelDependencies;
}

/**
 * Główna metoda walidacji ciągłości poziomów
 * Sprawdza czy możemy dodać budynek na określonym poziomie uwzględniając:
 * - Aktualny poziom w grze
 * - Budynki w kolejce budowy w grze  
 * - Budynki w naszej kolejce w bazie
 * @param serverId ID serwera
 * @param serverCode Kod serwera
 * @param villageId ID wioski
 * @param buildingId ID budynku
 * @param targetLevel Docelowy poziom
 * @param buildingName Nazwa budynku (do komunikatów)
 * @param page Strona przeglądarki
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws BadRequestException jeśli nie można dodać budynku na tym poziomie
 */
export async function validateLevelContinuityOperation(
    serverId: number,
    serverCode: string,
    villageId: string,
    buildingId: string,
    targetLevel: number,
    buildingName: string,
    page: Page,
    deps: ValidateLevelContinuityDependencies
): Promise<void> {
    const { logger, scrapeVillageBuildingDataDeps, getDatabaseQueueDeps, calculateNextAllowedLevelDeps } = deps;
    try {
        // 1. Pobierz wszystkie potrzebne dane
        const gameData = await scrapeVillageBuildingDataOperation(serverId, serverCode, villageId, page, scrapeVillageBuildingDataDeps);
        const databaseQueue = await getDatabaseQueueOperation(serverId, villageId, buildingId, getDatabaseQueueDeps);

        // 2. Oblicz następny dozwolony poziom
        const nextAllowedLevel = calculateNextAllowedLevelOperation(buildingId, gameData, databaseQueue, calculateNextAllowedLevelDeps);

        // 3. Sprawdź czy targetLevel to dokładnie następny dozwolony poziom
        if (targetLevel !== nextAllowedLevel) {
            const message = buildLevelContinuityErrorMessageOperation(
                buildingName,
                targetLevel,
                nextAllowedLevel,
                gameData,
                databaseQueue
            );

            logger.error(`Level continuity validation failed: ${message}`);
            throw new BadRequestException(message);
        }

        logger.log(`Level continuity validated successfully: ${buildingName} level ${targetLevel} can be added`);

    } catch (error) {
        if (error instanceof BadRequestException) {
            throw error;
        }
        logger.error(`Error validating level continuity for ${buildingId} level ${targetLevel} in village ${villageId}:`, error);
        throw new BadRequestException(`Failed to validate level continuity: ${error.message}`);
    }
}

