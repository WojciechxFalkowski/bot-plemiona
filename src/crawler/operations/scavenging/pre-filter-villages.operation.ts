import { Page } from 'playwright';
import { VillageResponseDto } from '@/villages/dto';
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';
import { AdvancedScavengingService } from '@/advanced-scavenging/advanced-scavenging.service';
import { unitOrder } from '../../../utils/scavenging.config';
import { Logger } from '@nestjs/common';

export interface PreFilterVillagesDependencies {
    page: Page;
    advancedScavengingService: AdvancedScavengingService;
    logger: Logger;
}

/**
 * Pre-filters villages to find those that need scavenging processing
 * @param serverId ID of the server
 * @param serverCode Server code (e.g., "pl216")
 * @param villages List of villages to filter
 * @param deps Dependencies needed for filtering
 * @returns List of villages that need processing
 */
export async function preFilterVillagesOperation(
    serverId: number,
    serverCode: string,
    villages: VillageResponseDto[],
    deps: PreFilterVillagesDependencies
): Promise<VillageResponseDto[]> {
    const { page, advancedScavengingService, logger } = deps;
    const villagesToProcess: VillageResponseDto[] = [];

    for (let i = 0; i < villages.length; i++) {
        const village = villages[i];
        logger.log(`Pre-filtering village ${i + 1}/${villages.length}: ${village.name} (ID: ${village.id})`);

        try {
            const scavengingUrl = `https://${serverCode}.plemiona.pl/game.php?village=${village.id}&screen=place&mode=scavenge`;
            await page.goto(scavengingUrl, { waitUntil: 'networkidle', timeout: 15000 });

            const levelStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);
            const freeLevels = levelStatuses.filter(s => s.isAvailable);

            if (freeLevels.length > 0) {
                const availableUnits = await ScavengingUtils.getAvailableUnits(page);
                const villageUnitsConfig = await advancedScavengingService.getVillageUnitsConfig(serverId, village.id);
                const enabledUnits = villageUnitsConfig.units;

                const hasAvailableEnabledUnits = unitOrder.some(unit =>
                    enabledUnits[unit] && (availableUnits[unit] || 0) > 0
                );

                if (hasAvailableEnabledUnits) {
                    villagesToProcess.push(village);
                }
            }

            if (i < villages.length - 1) {
                await page.waitForTimeout(1000);
            }
        } catch (error) {
            logger.error(`Error during pre-filtering for village ${village.name}:`, error);
        }
    }

    return villagesToProcess;
}

