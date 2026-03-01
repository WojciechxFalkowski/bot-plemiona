import { Logger } from '@nestjs/common';
import { TwDatabaseService } from '@/tw-database/tw-database.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';
import { CrawlerStatusService } from '@/crawler/crawler-status.service';

export interface ExecuteTwDatabaseTaskDependencies {
    twDatabaseService: TwDatabaseService;
    logger: Logger;
    executionLogId?: number | null;
    crawlerActivityLogsService?: CrawlerActivityLogsService;
    crawlerStatusService?: CrawlerStatusService;
}

/**
 * Builds activityContext for TW Database logging when executionLogId and service are available.
 */
function buildActivityContext(
    serverId: number,
    deps: ExecuteTwDatabaseTaskDependencies
): { executionLogId: number | null; serverId: number; logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>; onRecaptchaBlocked?: (id: number) => void } | undefined {
    const { executionLogId, crawlerActivityLogsService, crawlerStatusService } = deps;
    if (executionLogId == null || !crawlerActivityLogsService) return undefined;

    return {
        executionLogId,
        serverId,
        logActivity: async (evt) => {
            await crawlerActivityLogsService.logActivity({
                executionLogId,
                serverId,
                operationType: 'TW Database',
                eventType: evt.eventType,
                message: evt.message,
            });
        },
        onRecaptchaBlocked: crawlerStatusService
            ? (id) => crawlerStatusService.markRecaptchaBlocked(id)
            : undefined,
    };
}

/**
 * Executes TW Database visit attack planner for a server.
 */
export async function executeTwDatabaseTaskOperation(
    serverId: number,
    deps: ExecuteTwDatabaseTaskDependencies
): Promise<void> {
    const { twDatabaseService, logger } = deps;
    logger.log(`Executing TW Database for server ${serverId}`);

    const headless = process.env.NODE_ENV === 'production';
    const activityContext = buildActivityContext(serverId, deps);
    const result = await twDatabaseService.visitAttackPlanner(serverId, headless, activityContext);

    if (!result.success) {
        throw new Error(result.message ?? 'TW Database visit failed');
    }
}
