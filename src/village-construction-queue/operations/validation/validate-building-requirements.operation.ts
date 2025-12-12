import { BadRequestException } from '@nestjs/common';
import { Page } from 'playwright';
import { VillageDetailPage, getBuildingConfig } from '@/crawler/pages/village-detail.page';
import { ServersService } from '@/servers';

export interface ValidateBuildingRequirementsDependencies {
    serversService: ServersService;
    logger: any;
}

/**
 * Sprawdza wymagania budynku używając danych z gry
 * @param villageId ID wioski
 * @param buildingId ID budynku
 * @param serverId ID serwera
 * @param page Strona przeglądarki
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws BadRequestException jeśli wymagania nie są spełnione
 */
export async function validateBuildingRequirementsOperation(
    villageId: string,
    buildingId: string,
    serverId: number,
    page: Page,
    deps: ValidateBuildingRequirementsDependencies
): Promise<void> {
    const { serversService, logger } = deps;
    try {
        const villageDetailPage = new VillageDetailPage(page);
        const serverCode = await serversService.findById(serverId).then(server => server.serverCode);
        await villageDetailPage.navigateToVillage(serverCode, villageId);
        // Sprawdź wymagania budynku używając aktualnych danych z gry
        const requirementsCheck = await villageDetailPage.checkBuildingRequirements(serverCode, buildingId);

        if (!requirementsCheck.met) {
            const missingReqs = requirementsCheck.missingRequirements
                .map(req => {
                    const reqConfig = getBuildingConfig(req.buildingId);
                    const reqName = reqConfig ? reqConfig.name : req.buildingId;
                    return `${reqName} level ${req.level}`;
                })
                .join(', ');

            logger.error(`Building requirements not met for ${buildingId} in village ${villageId}. Missing: ${missingReqs}`);
            throw new BadRequestException(
                `Building requirements not met for ${buildingId}. Missing: ${missingReqs}`
            );
        }

        logger.log(`Building requirements validated successfully for ${buildingId} in village ${villageId}`);

    } catch (error) {
        if (error instanceof BadRequestException) {
            throw error;
        }
        logger.error(`Error validating building requirements for ${buildingId} in village ${villageId}:`, error);
        throw new BadRequestException(`Failed to validate building requirements: ${error.message}`);
    }
}

