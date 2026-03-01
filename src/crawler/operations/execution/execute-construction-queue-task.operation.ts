import { Logger } from '@nestjs/common';
import { VillageConstructionQueueService } from '@/village-construction-queue/village-construction-queue.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';

export interface ExecuteConstructionQueueTaskDependencies {
    constructionQueueService: VillageConstructionQueueService;
    logger: Logger;
    executionLogId?: number | null;
    crawlerActivityLogsService?: CrawlerActivityLogsService;
}

/**
 * Builds activityContext for Construction Queue logging when executionLogId and service are available.
 */
function buildActivityContext(
    serverId: number,
    deps: ExecuteConstructionQueueTaskDependencies
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
                operationType: 'Construction Queue',
                eventType: evt.eventType,
                message: evt.message,
            });
        },
    };
}

/**
 * Executes construction queue processing for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for execution
 */
export async function executeConstructionQueueTaskOperation(
    serverId: number,
    deps: ExecuteConstructionQueueTaskDependencies
): Promise<void> {
    const { constructionQueueService } = deps;
    const activityContext = buildActivityContext(serverId, deps);
    await constructionQueueService.processAndCheckConstructionQueue(serverId, activityContext);
}

