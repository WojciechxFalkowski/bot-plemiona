import { Logger } from '@nestjs/common';
import { PlayerVillagesService } from '@/player-villages/player-villages.service';

export interface ExecutePlayerVillageAttacksTaskDependencies {
    playerVillagesService: PlayerVillagesService;
    logger: Logger;
}

/**
 * Executes player village attacks for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for execution
 */
export async function executePlayerVillageAttacksTaskOperation(
    serverId: number,
    deps: ExecutePlayerVillageAttacksTaskDependencies
): Promise<void> {
    const { playerVillagesService, logger } = deps;
    logger.log(`🚀 Executing player village attacks for server ${serverId}`);

    try {
        await playerVillagesService.executeAttacks(serverId);
        logger.log(`✅ Player village attacks completed successfully for server ${serverId}`);
    } catch (error) {
        logger.error(`❌ Error executing player village attacks for server ${serverId}:`, error);
        throw error;
    }
}

