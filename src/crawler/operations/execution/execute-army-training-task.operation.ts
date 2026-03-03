import { Logger } from '@nestjs/common';
import { ArmyTrainingService } from '@/army-training/army-training.service';
import { ArmyTrainingStrategiesService } from '@/army-training/army-training-strategies.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';
import { CrawlerStatusService } from '@/crawler/crawler-status.service';

export interface ExecuteArmyTrainingTaskDependencies {
    armyTrainingService: ArmyTrainingService;
    armyTrainingStrategiesService: ArmyTrainingStrategiesService;
    logger: Logger;
    executionLogId?: number | null;
    crawlerActivityLogsService?: CrawlerActivityLogsService;
    crawlerStatusService?: CrawlerStatusService;
}

function buildActivityContext(
    serverId: number,
    deps: ExecuteArmyTrainingTaskDependencies
): { logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>; onRecaptchaBlocked?: (id: number) => void } | undefined {
    const { executionLogId, crawlerActivityLogsService, crawlerStatusService } = deps;
    if (executionLogId == null || !crawlerActivityLogsService) return undefined;
    return {
        logActivity: async (evt) =>
            crawlerActivityLogsService.logActivity({
                executionLogId: executionLogId!,
                serverId,
                operationType: 'Army Training',
                eventType: evt.eventType,
                message: evt.message,
            }),
        onRecaptchaBlocked: crawlerStatusService ? (id) => crawlerStatusService.markRecaptchaBlocked(id) : undefined
    };
}

/**
 * Executes army training for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for execution
 */
export async function executeArmyTrainingTaskOperation(
    serverId: number,
    deps: ExecuteArmyTrainingTaskDependencies
): Promise<void> {
    const { armyTrainingService, armyTrainingStrategiesService, logger } = deps;
    const activityContext = buildActivityContext(serverId, deps);
    logger.log(`🚀 Executing army training for server ${serverId}`);

    try {
        // Get active army training strategies for this server
        const strategies = await armyTrainingStrategiesService.findActiveByServer(serverId);
        if (strategies.length === 0) {
            logger.warn(`⚠️ No active army training strategies found for server ${serverId}`);
            return;
        }

        logger.log(`📋 Found ${strategies.length} active army training strategies for server ${serverId}`);

        // Execute army training for each strategy (village)
        for (const strategy of strategies) {
            logger.log(`⚔️ Starting army training for village ${strategy.villageId} on server ${serverId}`);

            try {
                await armyTrainingService.startTrainingUnits(strategy, serverId, activityContext);
                logger.log(`✅ Army training completed for village ${strategy.villageId} on server ${serverId}`);
            } catch (villageError) {
                const errorMsg = villageError instanceof Error ? villageError.message : String(villageError);
                logger.error(`❌ Error executing army training for village ${strategy.villageId} on server ${serverId}:`, villageError);
                if (errorMsg.includes('reCAPTCHA wymaga odblokowania')) {
                    throw villageError;
                }
                await activityContext?.logActivity({
                    eventType: CrawlerActivityEventType.ERROR,
                    message: `Błąd szkolenia w wiosce ${strategy.villageId}: ${errorMsg}`
                });
            }
        }

        logger.log(`🎯 All army training completed for server ${serverId}`);

    } catch (error) {
        logger.error(`❌ Error during army training execution for server ${serverId}:`, error);
        throw error;
    }
}

