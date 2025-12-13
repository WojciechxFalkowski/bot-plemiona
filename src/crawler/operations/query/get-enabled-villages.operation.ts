import { VillagesService } from '@/villages/villages.service';
import { VillageResponseDto } from '@/villages/dto';
import { Logger } from '@nestjs/common';

export interface GetEnabledVillagesDependencies {
    villagesService: VillagesService;
    logger: Logger;
}

/**
 * Gets villages with auto-scavenging enabled for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for query
 * @returns Array of villages with auto-scavenging enabled
 */
export async function getEnabledVillagesOperation(
    serverId: number,
    deps: GetEnabledVillagesDependencies
): Promise<VillageResponseDto[]> {
    const { villagesService, logger } = deps;

    try {
        const allVillages = await villagesService.findAll(serverId, false); // false = bez auto-refresh
        const enabledVillages = allVillages.filter(v => v.isAutoScavengingEnabled);

        logger.log(`Found ${enabledVillages.length} villages with auto-scavenging enabled`);
        return enabledVillages;
    } catch (error) {
        logger.error(`Error getting enabled villages for server ${serverId}:`, error);
        throw error;
    }
}


