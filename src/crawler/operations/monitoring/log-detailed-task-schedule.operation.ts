import { Logger } from '@nestjs/common';
import { MultiServerState, CrawlerTask } from '../query/get-multi-server-status.operation';
import { formatExecutionTimeOperation } from '../utilities/format-execution-time.operation';
import { findNextTaskToExecuteOperation } from '../scheduling/find-next-task-to-execute.operation';

export interface LogDetailedTaskScheduleDependencies {
    multiServerState: MultiServerState;
    logger: Logger;
}

/**
 * Logs detailed information about all upcoming tasks and their execution times
 * @param deps Dependencies needed for logging
 */
export function logDetailedTaskScheduleOperation(
    deps: LogDetailedTaskScheduleDependencies
): void {
    const { multiServerState, logger } = deps;

    logger.warn('📋 ============== DETAILED TASK SCHEDULE ==============');

    if (multiServerState.activeServers.length === 0) {
        logger.log('⚠️ No active servers found');
        return;
    }

    const now = new Date();
    const allTasks: Array<{
        serverCode: string;
        serverName: string;
        taskType: string;
        enabled: boolean;
        nextExecution: Date;
        timeUntilExecution: number;
        lastExecuted: Date | null;
    }> = [];

    // Collect all tasks from all servers
    for (const [serverId, plan] of multiServerState.serverPlans) {
        allTasks.push(
            {
                serverCode: plan.serverCode,
                serverName: plan.serverName,
                taskType: 'Construction Queue',
                enabled: plan.constructionQueue.enabled,
                nextExecution: plan.constructionQueue.nextExecutionTime,
                timeUntilExecution: plan.constructionQueue.nextExecutionTime.getTime() - now.getTime(),
                lastExecuted: plan.constructionQueue.lastExecuted
            },
            {
                serverCode: plan.serverCode,
                serverName: plan.serverName,
                taskType: 'Scavenging',
                enabled: plan.scavenging.enabled,
                nextExecution: plan.scavenging.nextExecutionTime,
                timeUntilExecution: plan.scavenging.nextExecutionTime.getTime() - now.getTime(),
                lastExecuted: plan.scavenging.lastExecuted
            },
            {
                serverCode: plan.serverCode,
                serverName: plan.serverName,
                taskType: 'Mini Attacks',
                enabled: plan.miniAttacks.enabled,
                nextExecution: plan.miniAttacks.nextExecutionTime,
                timeUntilExecution: plan.miniAttacks.nextExecutionTime.getTime() - now.getTime(),
                lastExecuted: plan.miniAttacks.lastExecuted
            },
            {
                serverCode: plan.serverCode,
                serverName: plan.serverName,
                taskType: 'Player Village Attacks',
                enabled: plan.playerVillageAttacks.enabled,
                nextExecution: plan.playerVillageAttacks.nextExecutionTime,
                timeUntilExecution: plan.playerVillageAttacks.nextExecutionTime.getTime() - now.getTime(),
                lastExecuted: plan.playerVillageAttacks.lastExecuted
            },
            {
                serverCode: plan.serverCode,
                serverName: plan.serverName,
                taskType: 'Army Training',
                enabled: plan.armyTraining.enabled,
                nextExecution: plan.armyTraining.nextExecutionTime,
                timeUntilExecution: plan.armyTraining.nextExecutionTime.getTime() - now.getTime(),
                lastExecuted: plan.armyTraining.lastExecuted
            }
        );
    }

    // Sort tasks by execution time
    allTasks.sort((a, b) => a.timeUntilExecution - b.timeUntilExecution);

    // Log enabled tasks first
    const enabledTasks = allTasks.filter(task => task.enabled);
    if (enabledTasks.length > 0) {
        logger.log('🟢 ENABLED TASKS (sorted by execution time):');
        enabledTasks.forEach((task, index) => {
            const timeString = formatExecutionTimeOperation(task.timeUntilExecution);
            const lastExecutedStr = task.lastExecuted
                ? `(last: ${task.lastExecuted.toLocaleTimeString()})`
                : '(never executed)';

            logger.log(`  ${index + 1}. ${task.taskType} - ${task.serverCode} (${task.serverName})`);
            logger.log(`     ⏰ Next execution: ${task.nextExecution.toLocaleString()} (in ${timeString})`);
            logger.log(`     📅 ${lastExecutedStr}`);
        });
    } else {
        logger.error('🔴 No enabled tasks found');
    }

    // Log disabled tasks
    const disabledTasks = allTasks.filter(task => !task.enabled);
    if (disabledTasks.length > 0) {
        logger.log('⚪ DISABLED TASKS:');
        disabledTasks.forEach(task => {
            logger.log(`  - ${task.taskType} - ${task.serverCode} (${task.serverName})`);
        });
    }

    // Log next scheduled task
    const nextTask = findNextTaskToExecuteOperation({ multiServerState });
    if (nextTask) {
        const plan = multiServerState.serverPlans.get(nextTask.serverId);
        const serverInfo = plan ? `${plan.serverCode} (${plan.serverName})` : `server ${nextTask.serverId}`;

        // Handle both manual tasks and regular tasks
        let executionTime: Date;
        if (nextTask.isManualTask) {
            executionTime = nextTask.task.scheduledFor;
        } else {
            executionTime = (nextTask.task as CrawlerTask).nextExecutionTime;
        }
        const timeString = formatExecutionTimeOperation(executionTime.getTime() - now.getTime());

        logger.log('🎯 NEXT SCHEDULED TASK:');
        logger.log(`  ${nextTask.taskType} - ${serverInfo}`);
        logger.log(`  ⏰ Execution time: ${executionTime.toLocaleString()} (in ${timeString})`);
    }

    logger.warn('📋 ============== END TASK SCHEDULE ==============');
}


