import { ServerResponseDto } from '@/servers/dto';

export interface CrawlerTask {
    nextExecutionTime: Date;
    enabled: boolean;
    lastExecuted: Date | null;
    name: string;
}

/**
 * Types of manual tasks that can be queued
 */
export type ManualTaskType = 'sendSupport' | 'fetchVillageUnits';

/**
 * Status of a manual task
 */
export type ManualTaskStatus = 'pending' | 'executing' | 'completed' | 'failed';

/**
 * Manual task that can be queued for execution
 */
export interface ManualTask {
    /** Unique identifier (UUID) */
    id: string;
    /** Type of manual task */
    type: ManualTaskType;
    /** Server ID for which the task should be executed */
    serverId: number;
    /** Task-specific payload (e.g., SendSupportDto) */
    payload: unknown;
    /** When the task was added to queue */
    queuedAt: Date;
    /** When the task should be executed (usually now) */
    scheduledFor: Date;
    /** Current status of the task */
    status: ManualTaskStatus;
    /** Error message if task failed */
    error?: string;
    /** When the task completed (success or failure) */
    completedAt?: Date;
}

export interface ServerCrawlerPlan {
    serverId: number;
    serverCode: string;
    serverName: string;
    isActive: boolean;
    constructionQueue: CrawlerTask;
    scavenging: CrawlerTask & {
        optimalDelay: number | null;
    };
    miniAttacks: CrawlerTask & {
        nextTargetIndex: number;
        lastAttackTime: Date | null;
    };
    playerVillageAttacks: CrawlerTask & {
        nextTargetIndex: number;
        lastAttackTime: Date | null;
    };
    armyTraining: CrawlerTask & {
        villageId: string | null;
    };
    lastSuccessfulExecution: Date | null;
}

export interface MultiServerState {
    currentServerIndex: number;
    activeServers: ServerResponseDto[];
    serverPlans: Map<number, ServerCrawlerPlan>;
    isRotating: boolean;
    /** Queue of manual tasks waiting for execution */
    manualTaskQueue: ManualTask[];
}

export interface GetMultiServerStatusDependencies {
    multiServerState: MultiServerState;
    mainTimer: NodeJS.Timeout | null;
    monitoringTimer: NodeJS.Timeout | null;
}

/**
 * Response structure for manual task queue status
 */
export interface ManualTaskQueueStatus {
    totalPending: number;
    tasks: Array<{
        id: string;
        type: ManualTaskType;
        serverId: number;
        status: ManualTaskStatus;
        queuedAt: Date;
        scheduledFor: Date;
    }>;
}

export interface MultiServerStatusResponse {
    activeServersCount: number;
    currentServerIndex: number;
    isRotating: boolean;
    schedulerActive: boolean;
    monitoringActive: boolean;
    /** Manual task queue status */
    manualTaskQueue: ManualTaskQueueStatus;
    servers: Array<{
        serverId: number;
        serverCode: string;
        serverName: string;
        isActive: boolean;
        lastSuccessfulExecution: Date | null;
        tasks: {
            constructionQueue: {
                enabled: boolean;
                nextExecution: Date;
                lastExecuted: Date | null;
            };
            scavenging: {
                enabled: boolean;
                nextExecution: Date;
                lastExecuted: Date | null;
                optimalDelay: number | null;
            };
            miniAttacks: {
                enabled: boolean;
                nextExecution: Date;
                lastExecuted: Date | null;
                lastAttackTime: Date | null;
            };
            playerVillageAttacks: {
                enabled: boolean;
                nextExecution: Date;
                lastExecuted: Date | null;
                lastAttackTime: Date | null;
            };
            armyTraining: {
                enabled: boolean;
                nextExecution: Date;
                lastExecuted: Date | null;
                villageId: string | null;
            };
        };
    }>;
}

/**
 * Gets status information for all servers
 * @param deps Dependencies containing multi-server state
 * @returns Multi-server status information
 */
export function getMultiServerStatusOperation(
    deps: GetMultiServerStatusDependencies
): MultiServerStatusResponse {
    const { multiServerState, mainTimer, monitoringTimer } = deps;

    const serverStatuses = Array.from(multiServerState.serverPlans.values()).map(plan => ({
        serverId: plan.serverId,
        serverCode: plan.serverCode,
        serverName: plan.serverName,
        isActive: plan.isActive,
        lastSuccessfulExecution: plan.lastSuccessfulExecution,
        tasks: {
            constructionQueue: {
                enabled: plan.constructionQueue.enabled,
                nextExecution: plan.constructionQueue.nextExecutionTime,
                lastExecuted: plan.constructionQueue.lastExecuted
            },
            scavenging: {
                enabled: plan.scavenging.enabled,
                nextExecution: plan.scavenging.nextExecutionTime,
                lastExecuted: plan.scavenging.lastExecuted,
                optimalDelay: plan.scavenging.optimalDelay
            },
            miniAttacks: {
                enabled: plan.miniAttacks.enabled,
                nextExecution: plan.miniAttacks.nextExecutionTime,
                lastExecuted: plan.miniAttacks.lastExecuted,
                lastAttackTime: plan.miniAttacks.lastAttackTime
            },
            playerVillageAttacks: {
                enabled: plan.playerVillageAttacks.enabled,
                nextExecution: plan.playerVillageAttacks.nextExecutionTime,
                lastExecuted: plan.playerVillageAttacks.lastExecuted,
                lastAttackTime: plan.playerVillageAttacks.lastAttackTime
            },
            armyTraining: {
                enabled: plan.armyTraining.enabled,
                nextExecution: plan.armyTraining.nextExecutionTime,
                lastExecuted: plan.armyTraining.lastExecuted,
                villageId: plan.armyTraining.villageId
            }
        }
    }));

    const manualTaskQueueStatus: ManualTaskQueueStatus = {
        totalPending: multiServerState.manualTaskQueue.filter(t => t.status === 'pending').length,
        tasks: multiServerState.manualTaskQueue.map(task => ({
            id: task.id,
            type: task.type,
            serverId: task.serverId,
            status: task.status,
            queuedAt: task.queuedAt,
            scheduledFor: task.scheduledFor
        }))
    };

    return {
        activeServersCount: multiServerState.activeServers.length,
        currentServerIndex: multiServerState.currentServerIndex,
        isRotating: multiServerState.isRotating,
        schedulerActive: !!mainTimer,
        monitoringActive: !!monitoringTimer,
        manualTaskQueue: manualTaskQueueStatus,
        servers: serverStatuses
    };
}


