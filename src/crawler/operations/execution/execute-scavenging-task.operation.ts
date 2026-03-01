import { Logger } from '@nestjs/common';
import { CrawlerService } from '../../crawler.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';

export interface ExecuteScavengingTaskDependencies {
    crawlerService: CrawlerService;
    logger: Logger;
    executionLogId?: number | null;
    crawlerActivityLogsService?: CrawlerActivityLogsService;
}

/**
 * Builds activityContext for Scavenging logging when executionLogId and service are available.
 */
function buildActivityContext(
    serverId: number,
    deps: ExecuteScavengingTaskDependencies
): {
    executionLogId: number | null;
    serverId: number;
    logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>;
} | undefined {
    const { executionLogId, crawlerActivityLogsService } = deps;
    if (executionLogId == null || !crawlerActivityLogsService) return undefined;

    return {
        executionLogId,
        serverId,
        logActivity: async (evt) => {
            await crawlerActivityLogsService.logActivity({
                executionLogId: executionLogId!,
                serverId,
                operationType: 'Scavenging',
                eventType: evt.eventType,
                message: evt.message,
            });
        },
    };
}

/**
 * Executes scavenging processing for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for execution
 */
export async function executeScavengingTaskOperation(
    serverId: number,
    deps: ExecuteScavengingTaskDependencies
): Promise<void> {
    const { crawlerService, logger } = deps;
    logger.log(`🚀 Executing scavenging for server ${serverId}`);
    const activityContext = buildActivityContext(serverId, deps);
    await crawlerService.performScavenging(serverId, activityContext);
}

