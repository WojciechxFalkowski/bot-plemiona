import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { MultiServerState, ManualTask, ManualTaskType } from '../query/get-multi-server-status.operation';

export interface AddManualTaskDependencies {
    multiServerState: MultiServerState;
    logger: Logger;
}

export interface AddManualTaskConfig {
    type: ManualTaskType;
    serverId: number;
    payload: unknown;
}

export interface AddManualTaskResult {
    taskId: string;
    queuePosition: number;
    estimatedWaitTime: number;
}

/**
 * Adds a manual task to the queue for execution
 * @param config Task configuration (type, serverId, payload)
 * @param deps Dependencies containing multi-server state and logger
 * @returns Result with task ID, queue position, and estimated wait time
 */
export function addManualTaskOperation(
    config: AddManualTaskConfig,
    deps: AddManualTaskDependencies
): AddManualTaskResult {
    const { multiServerState, logger } = deps;
    const { type, serverId, payload } = config;

    const now = new Date();
    const taskId = uuidv4();

    const task: ManualTask = {
        id: taskId,
        type,
        serverId,
        payload,
        queuedAt: now,
        scheduledFor: now,
        status: 'pending'
    };

    multiServerState.manualTaskQueue.push(task);

    // Calculate queue position (1-based for user-friendly display)
    const pendingTasks = multiServerState.manualTaskQueue.filter(t => t.status === 'pending');
    const queuePosition = pendingTasks.length;

    // Estimate wait time based on average task duration and queue position
    // Assume ~60 seconds per task as a rough estimate
    const averageTaskDuration = 60;
    const estimatedWaitTime = (queuePosition - 1) * averageTaskDuration;

    logger.log(
        `📋 Manual task queued: ${type} for server ${serverId} ` +
        `(taskId=${taskId}, position=${queuePosition})`
    );

    return {
        taskId,
        queuePosition,
        estimatedWaitTime
    };
}

/**
 * Gets a manual task by its ID
 * @param taskId Task ID to find
 * @param deps Dependencies containing multi-server state
 * @returns Manual task or null if not found
 */
export function getManualTaskByIdOperation(
    taskId: string,
    deps: Pick<AddManualTaskDependencies, 'multiServerState'>
): ManualTask | null {
    const { multiServerState } = deps;
    return multiServerState.manualTaskQueue.find(t => t.id === taskId) ?? null;
}

/**
 * Gets all pending manual tasks
 * @param deps Dependencies containing multi-server state
 * @returns Array of pending manual tasks
 */
export function getPendingManualTasksOperation(
    deps: Pick<AddManualTaskDependencies, 'multiServerState'>
): ManualTask[] {
    const { multiServerState } = deps;
    return multiServerState.manualTaskQueue.filter(t => t.status === 'pending');
}

/**
 * Removes completed or failed tasks older than specified duration
 * @param maxAgeMs Maximum age in milliseconds for completed/failed tasks
 * @param deps Dependencies containing multi-server state and logger
 * @returns Number of tasks removed
 */
export function cleanupCompletedManualTasksOperation(
    maxAgeMs: number,
    deps: AddManualTaskDependencies
): number {
    const { multiServerState, logger } = deps;
    const now = Date.now();
    const initialLength = multiServerState.manualTaskQueue.length;

    multiServerState.manualTaskQueue = multiServerState.manualTaskQueue.filter(task => {
        if (task.status === 'pending' || task.status === 'executing') {
            return true;
        }
        if (task.completedAt) {
            const age = now - task.completedAt.getTime();
            return age < maxAgeMs;
        }
        return true;
    });

    const removedCount = initialLength - multiServerState.manualTaskQueue.length;
    if (removedCount > 0) {
        logger.debug(`🧹 Cleaned up ${removedCount} completed manual tasks`);
    }

    return removedCount;
}


