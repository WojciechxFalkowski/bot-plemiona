import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan, MultiServerState } from '../query/get-multi-server-status.operation';
import { CrawlerExecutionLogsService } from '@/crawler-execution-logs/crawler-execution-logs.service';
import { ExecutionStatus } from '@/crawler-execution-logs/entities/crawler-execution-log.entity';
import { executeConstructionQueueTaskOperation, ExecuteConstructionQueueTaskDependencies } from './execute-construction-queue-task.operation';
import { executeScavengingTaskOperation, ExecuteScavengingTaskDependencies } from './execute-scavenging-task.operation';
import { executeMiniAttacksTaskOperation, ExecuteMiniAttacksTaskDependencies } from './execute-mini-attacks-task.operation';
import { executePlayerVillageAttacksTaskOperation, ExecutePlayerVillageAttacksTaskDependencies } from './execute-player-village-attacks-task.operation';
import { executeArmyTrainingTaskOperation, ExecuteArmyTrainingTaskDependencies } from './execute-army-training-task.operation';
import { updateNextConstructionTimeOperation, UpdateNextConstructionTimeDependencies } from '../scheduling/update-next-construction-time.operation';
import { updateNextScavengingTimeOperation, UpdateNextScavengingTimeDependencies } from '../scheduling/update-next-scavenging-time.operation';
import { updateNextMiniAttackTimeOperation, UpdateNextMiniAttackTimeDependencies } from '../scheduling/update-next-mini-attack-time.operation';
import { updateNextPlayerVillageAttackTimeOperation, UpdateNextPlayerVillageAttackTimeDependencies } from '../scheduling/update-next-player-village-attack-time.operation';
import { updateNextArmyTrainingTimeOperation, UpdateNextArmyTrainingTimeDependencies } from '../scheduling/update-next-army-training-time.operation';
import { updateNextExecutionTimeForFailedTaskOperation, UpdateNextExecutionTimeForFailedTaskDependencies } from '../scheduling/update-next-execution-time-for-failed-task.operation';

export interface ExecuteServerTaskDependencies
    extends ExecuteConstructionQueueTaskDependencies,
        ExecuteScavengingTaskDependencies,
        ExecuteMiniAttacksTaskDependencies,
        ExecutePlayerVillageAttacksTaskDependencies,
        ExecuteArmyTrainingTaskDependencies,
        UpdateNextConstructionTimeDependencies,
        Omit<UpdateNextScavengingTimeDependencies, 'scavengingTimeData'>,
        UpdateNextMiniAttackTimeDependencies,
        UpdateNextPlayerVillageAttackTimeDependencies,
        UpdateNextArmyTrainingTimeDependencies,
        UpdateNextExecutionTimeForFailedTaskDependencies {
    multiServerState: MultiServerState;
    crawlerExecutionLogsService: CrawlerExecutionLogsService;
    crawlerService: any; // CrawlerService - need to get scavengingTimeData
    logger: Logger;
}

/**
 * Executes a task for a specific server
 * @param serverId ID of the server
 * @param taskType Type of task to execute
 * @param deps Dependencies needed for execution
 */
export async function executeServerTaskOperation(
    serverId: number,
    taskType: string,
    deps: ExecuteServerTaskDependencies
): Promise<void> {
    const { multiServerState, crawlerExecutionLogsService, crawlerService, logger } = deps;
    const plan = multiServerState.serverPlans.get(serverId);

    if (!plan) {
        logger.error(`❌ No plan found for server ${serverId}`);
        return;
    }

    logger.log(`🚀 Executing ${taskType} for server ${plan.serverCode} (${plan.serverName})`);

    // Visible START banner with runId and timestamp
    const runId = `${taskType.replace(/\s+/g, '_')}-${plan.serverCode}-${Date.now()}`;
    const startTs = Date.now();
    const startedAt = new Date(startTs);
    logger.warn('══════════════════════════════════════════════════════════════════════════════');
    logger.warn(`🟩 START | ${taskType} | ${plan.serverCode} (${plan.serverName}) | runId=${runId}`);
    logger.warn(`⏱️ Started at: ${startedAt.toLocaleString()}`);
    logger.warn('══════════════════════════════════════════════════════════════════════════════');

    // Get villageId if applicable (for Army Training)
    let villageId: string | null = null;
    if (taskType === 'Army Training' && plan.armyTraining.villageId) {
        villageId = plan.armyTraining.villageId;
    }

    // Create execution log entry
    let executionLogId: number | null = null;
    try {
        const executionLog = await crawlerExecutionLogsService.logExecution({
            serverId: serverId,
            villageId: villageId,
            title: taskType,
            description: null,
            startedAt: startedAt,
        });
        executionLogId = executionLog.id;
    } catch (logError) {
        logger.error(`❌ Failed to create execution log:`, logError);
    }

    try {
        switch (taskType) {
            case 'Construction Queue':
                await executeConstructionQueueTaskOperation(serverId, deps);
                updateNextConstructionTimeOperation(plan, deps);
                break;
            case 'Scavenging':
                await executeScavengingTaskOperation(serverId, deps);
                const scavengingData = crawlerService.getScavengingTimeData();
                updateNextScavengingTimeOperation(plan, {
                    scavengingTimeData: scavengingData,
                    logger: deps.logger
                });
                break;
            case 'Mini Attacks':
                await executeMiniAttacksTaskOperation(serverId, deps);
                await updateNextMiniAttackTimeOperation(plan, serverId, deps);
                break;
            case 'Player Village Attacks':
                await executePlayerVillageAttacksTaskOperation(serverId, deps);
                await updateNextPlayerVillageAttackTimeOperation(plan, serverId, deps);
                break;
            case 'Army Training':
                await executeArmyTrainingTaskOperation(serverId, deps);
                await updateNextArmyTrainingTimeOperation(plan, serverId, deps);
                break;
            default:
                logger.error(`❌ Unknown task type: ${taskType}`);
        }

        // Mark as successful
        plan.lastSuccessfulExecution = new Date();

        const durationMs = Date.now() - startTs;
        const endedAt = new Date();
        logger.warn('══════════════════════════════════════════════════════════════════════════════');
        logger.warn(`🟦 END   | ${taskType} | ${plan.serverCode} | runId=${runId}`);
        logger.warn(`✅ Status: success | ⌛ Duration: ${Math.round(durationMs / 1000)}s (${durationMs}ms)`);
        logger.warn(`🕒 Ended at: ${endedAt.toLocaleString()}`);
        logger.warn('══════════════════════════════════════════════════════════════════════════════');

        logger.log(`✅ ${taskType} completed successfully for server ${plan.serverCode}`);

        // Update execution log with success status
        if (executionLogId !== null) {
            try {
                await crawlerExecutionLogsService.updateExecutionLog(executionLogId, {
                    endedAt: endedAt,
                    status: ExecutionStatus.SUCCESS,
                    description: null,
                });
            } catch (logError) {
                logger.error(`❌ Failed to update execution log:`, logError);
            }
        }

    } catch (error) {
        const durationMs = Date.now() - startTs;
        const endedAt = new Date();
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('══════════════════════════════════════════════════════════════════════════════');
        logger.warn(`🟥 END   | ${taskType} | ${plan.serverCode} | runId=${runId}`);
        logger.warn(`❌ Status: error   | ⌛ Duration: ${Math.round(durationMs / 1000)}s (${durationMs}ms)`);
        logger.warn(`🕒 Ended at: ${endedAt.toLocaleString()}`);
        logger.warn('══════════════════════════════════════════════════════════════════════════════');

        logger.error(`❌ Error executing ${taskType} for server ${plan.serverCode}:`, error);

        // Update execution log with error status
        if (executionLogId !== null) {
            try {
                await crawlerExecutionLogsService.updateExecutionLog(executionLogId, {
                    endedAt: endedAt,
                    status: ExecutionStatus.ERROR,
                    description: errorMessage,
                });
            } catch (logError) {
                logger.error(`❌ Failed to update execution log:`, logError);
            }
        }

        // Update next execution time for the failed task to prevent immediate retry
        updateNextExecutionTimeForFailedTaskOperation(plan, taskType, deps);
    }
}

