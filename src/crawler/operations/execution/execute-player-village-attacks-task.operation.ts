import { Logger } from '@nestjs/common';
import { PlayerVillagesService } from '@/player-villages/player-villages.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';

export interface ExecutePlayerVillageAttacksTaskDependencies {
    playerVillagesService: PlayerVillagesService;
    logger: Logger;
    executionLogId?: number | null;
    crawlerActivityLogsService?: CrawlerActivityLogsService;
}

function buildActivityContext(
    serverId: number,
    deps: ExecutePlayerVillageAttacksTaskDependencies
): { logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void> } | undefined {
    const { executionLogId, crawlerActivityLogsService } = deps;
    if (executionLogId == null || !crawlerActivityLogsService) return undefined;
    return {
        logActivity: async (evt) =>
            crawlerActivityLogsService.logActivity({
                executionLogId: executionLogId!,
                serverId,
                operationType: 'Player Village Attacks',
                eventType: evt.eventType,
                message: evt.message,
            }),
    };
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
    const activityContext = buildActivityContext(serverId, deps);
    logger.log(`🚀 Executing player village attacks for server ${serverId}`);

    try {
        await playerVillagesService.executeAttacks(serverId, activityContext);
        logger.log(`✅ Player village attacks completed successfully for server ${serverId}`);
    } catch (error) {
        logger.error(`❌ Error executing player village attacks for server ${serverId}:`, error);
        throw error;
    }
}

