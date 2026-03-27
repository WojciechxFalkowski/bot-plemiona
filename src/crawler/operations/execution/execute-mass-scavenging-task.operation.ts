import { Logger } from '@nestjs/common';
import { CrawlerService } from '../../crawler.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';
import { CrawlerStatusService } from '@/crawler/crawler-status.service';

export interface ExecuteMassScavengingTaskDependencies {
    crawlerService: CrawlerService;
    logger: Logger;
    executionLogId?: number | null;
    crawlerActivityLogsService?: CrawlerActivityLogsService;
    crawlerStatusService?: CrawlerStatusService;
}

function buildActivityContext(
    serverId: number,
    deps: ExecuteMassScavengingTaskDependencies
):
    | {
          executionLogId: number | null;
          serverId: number;
          logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>;
          onRecaptchaBlocked?: (id: number) => void;
      }
    | undefined {
    const { executionLogId, crawlerActivityLogsService, crawlerStatusService } = deps;
    if (executionLogId == null || !crawlerActivityLogsService) return undefined;
    return {
        executionLogId,
        serverId,
        logActivity: async (evt) => {
            await crawlerActivityLogsService.logActivity({
                executionLogId: executionLogId!,
                serverId,
                operationType: 'Mass Scavenging',
                eventType: evt.eventType,
                message: evt.message
            });
        },
        onRecaptchaBlocked: crawlerStatusService ? (id) => crawlerStatusService.markRecaptchaBlocked(id) : undefined
    };
}

/**
 * Executes mass scavenging (scavenge_mass) for a server.
 */
export async function executeMassScavengingTaskOperation(
    serverId: number,
    deps: ExecuteMassScavengingTaskDependencies
): Promise<void> {
    const { crawlerService, logger } = deps;
    logger.log(`Executing mass scavenging for server ${serverId}`);
    const activityContext = buildActivityContext(serverId, deps);
    await crawlerService.performMassScavenging(serverId, activityContext);
}
