import { Logger } from '@nestjs/common';
import { MultiServerState, ManualTask, ManualTaskType } from '../query/get-multi-server-status.operation';
import { sendSupportOperation, SendSupportConfig, SendSupportResult, SendSupportDependencies } from '@/support/operations/send-support.operation';
import { SendSupportDto } from '@/support/dto/send-support.dto';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { CrawlerService } from '@/crawler/crawler.service';

/**
 * Result of executing a manual task
 */
export interface ExecuteManualTaskResult {
    taskId: string;
    type: ManualTaskType;
    success: boolean;
    result?: unknown;
    error?: string;
    executionTimeMs: number;
}

/**
 * Dependencies for executing manual tasks
 */
export interface ExecuteManualTaskDependencies {
    multiServerState: MultiServerState;
    logger: Logger;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    serversService: ServersService;
    crawlerService: CrawlerService;
}

/**
 * Marks a task as executing in the queue
 */
function markTaskAsExecuting(task: ManualTask): void {
    task.status = 'executing';
}

/**
 * Marks a task as completed in the queue
 */
function markTaskAsCompleted(task: ManualTask, success: boolean, error?: string): void {
    task.status = success ? 'completed' : 'failed';
    task.completedAt = new Date();
    if (error) {
        task.error = error;
    }
}

/**
 * Executes a sendSupport manual task
 * After successful dispatch, refreshes village units cache so user sees updated data
 */
async function executeSendSupportTask(
    task: ManualTask,
    deps: ExecuteManualTaskDependencies
): Promise<SendSupportResult> {
    const { logger, credentials, plemionaCookiesService, serversService, crawlerService } = deps;
    const payload = task.payload as SendSupportDto;

    // Get server info
    const server = await serversService.findById(payload.serverId);
    if (!server) {
        throw new Error(`Server ${payload.serverId} not found`);
    }

    const config: SendSupportConfig = {
        serverId: payload.serverId,
        serverCode: server.serverCode,
        serverName: server.serverName,
        targetVillageId: payload.targetVillageId,
        allocations: payload.allocations,
        headless: payload.headless ?? true,
    };

    const sendSupportDeps: SendSupportDependencies = {
        logger,
        credentials,
        plemionaCookiesService,
    };

    const result = await sendSupportOperation(config, sendSupportDeps);

    // After successful support dispatch, refresh village units cache
    // so user sees updated troop counts when clicking "Pobierz stany wojsk"
    if (result.success || result.successfulDispatches > 0) {
        logger.log(`🔄 Refreshing village units cache after support dispatch...`);
        try {
            await crawlerService.getVillageUnitsData(payload.serverId, true);
            logger.log(`✅ Village units cache refreshed for server ${payload.serverId}`);
        } catch (cacheError) {
            // Log but don't fail the task - support was already sent
            logger.warn(`⚠️ Failed to refresh village units cache: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`);
        }
    }

    return result;
}

/**
 * Executes a fetchVillageUnits manual task
 */
async function executeFetchVillageUnitsTask(
    task: ManualTask,
    deps: ExecuteManualTaskDependencies
): Promise<unknown> {
    const { logger, crawlerService } = deps;
    const payload = task.payload as { serverId: number; forceRefresh?: boolean };

    logger.log(`Fetching village units for server ${payload.serverId}`);

    // Call the crawler service to fetch village units
    // forceRefresh = true means we skip cache
    return crawlerService.getVillageUnitsData(payload.serverId, payload.forceRefresh ?? true);
}

/**
 * Executes a manual task from the queue
 * 
 * @param task The manual task to execute
 * @param deps Dependencies needed for execution
 * @returns Result of the task execution
 */
export async function executeManualTaskOperation(
    task: ManualTask,
    deps: ExecuteManualTaskDependencies
): Promise<ExecuteManualTaskResult> {
    const { logger } = deps;
    const startTime = Date.now();

    logger.log(`🔧 Executing manual task: ${task.type} (taskId=${task.id})`);

    // Mark task as executing
    markTaskAsExecuting(task);

    try {
        let result: unknown;

        switch (task.type) {
            case 'sendSupport':
                result = await executeSendSupportTask(task, deps);
                break;

            case 'fetchVillageUnits':
                result = await executeFetchVillageUnitsTask(task, deps);
                break;

            default:
                throw new Error(`Unknown manual task type: ${task.type}`);
        }

        // Mark task as completed
        markTaskAsCompleted(task, true);

        const executionTimeMs = Date.now() - startTime;
        logger.log(`✅ Manual task completed: ${task.type} (taskId=${task.id}, ${executionTimeMs}ms)`);

        return {
            taskId: task.id,
            type: task.type,
            success: true,
            result,
            executionTimeMs,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const executionTimeMs = Date.now() - startTime;

        // Mark task as failed
        markTaskAsCompleted(task, false, errorMessage);

        logger.error(`❌ Manual task failed: ${task.type} (taskId=${task.id}): ${errorMessage}`);

        return {
            taskId: task.id,
            type: task.type,
            success: false,
            error: errorMessage,
            executionTimeMs,
        };
    }
}

/**
 * Finds the next pending manual task to execute
 * Returns the task with the earliest scheduledFor time
 */
export function findNextPendingManualTask(
    deps: Pick<ExecuteManualTaskDependencies, 'multiServerState'>
): ManualTask | null {
    const { multiServerState } = deps;
    
    const pendingTasks = multiServerState.manualTaskQueue
        .filter(t => t.status === 'pending')
        .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

    return pendingTasks[0] ?? null;
}

/**
 * Checks if there are any pending manual tasks ready for execution
 */
export function hasPendingManualTasks(
    deps: Pick<ExecuteManualTaskDependencies, 'multiServerState'>
): boolean {
    const { multiServerState } = deps;
    const now = Date.now();

    return multiServerState.manualTaskQueue.some(
        t => t.status === 'pending' && t.scheduledFor.getTime() <= now
    );
}

