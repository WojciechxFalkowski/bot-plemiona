import { MultiServerState, CrawlerTask, ManualTask } from '../query/get-multi-server-status.operation';

export interface FindNextTaskToExecuteDependencies {
    multiServerState: MultiServerState;
}

/**
 * Result type for regular (recurring) tasks
 */
export interface NextRegularTaskResult {
    task: CrawlerTask;
    serverId: number;
    taskType: string;
    isManualTask: false;
}

/**
 * Result type for manual (one-time) tasks
 */
export interface NextManualTaskResult {
    task: ManualTask;
    serverId: number;
    taskType: string;
    isManualTask: true;
}

/**
 * Union type for next task result
 */
export type NextTaskResult = NextRegularTaskResult | NextManualTaskResult;

/**
 * Finds the next pending manual task that is ready for execution
 * @param multiServerState State containing manual task queue
 * @returns Manual task result or null if no pending manual tasks
 */
function findNextPendingManualTask(
    multiServerState: MultiServerState
): NextManualTaskResult | null {
    const now = Date.now();

    // Find pending manual tasks that are ready (scheduledFor <= now)
    const readyTasks = multiServerState.manualTaskQueue
        .filter(t => t.status === 'pending' && t.scheduledFor.getTime() <= now)
        .sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());

    if (readyTasks.length === 0) {
        return null;
    }

    const task = readyTasks[0];
    return {
        task,
        serverId: task.serverId,
        taskType: `Manual: ${task.type}`,
        isManualTask: true
    };
}

/**
 * Finds the next regular task to execute across all servers
 * @param multiServerState State containing server plans
 * @returns Regular task result or null if no tasks scheduled
 */
function findNextRegularTask(
    multiServerState: MultiServerState
): NextRegularTaskResult | null {
    let earliestTask: NextRegularTaskResult | null = null;
    let earliestTime = Number.MAX_SAFE_INTEGER;

    for (const [serverId, plan] of multiServerState.serverPlans) {
        const tasks = [
            { task: plan.constructionQueue, type: 'Construction Queue' },
            { task: plan.scavenging, type: 'Scavenging' },
            { task: plan.miniAttacks, type: 'Mini Attacks' },
            { task: plan.playerVillageAttacks, type: 'Player Village Attacks' },
            { task: plan.armyTraining, type: 'Army Training' },
            { task: plan.twDatabase, type: 'TW Database' }
        ];

        for (const { task, type } of tasks) {
            if (task.enabled && task.nextExecutionTime.getTime() < earliestTime) {
                earliestTime = task.nextExecutionTime.getTime();
                earliestTask = { task, serverId, taskType: type, isManualTask: false };
            }
        }
    }

    return earliestTask;
}

/**
 * Finds the next task to execute across all servers
 * 
 * Priority logic:
 * 1. Check for pending manual tasks that are ready (scheduledFor <= now)
 * 2. If a manual task is ready, return it (manual tasks have priority when ready)
 * 3. Otherwise, return the earliest regular task
 * 
 * This ensures manual tasks run ASAP but don't interrupt tasks about to run
 * 
 * @param deps Dependencies containing multi-server state
 * @returns Next task to execute or null if no tasks scheduled
 */
export function findNextTaskToExecuteOperation(
    deps: FindNextTaskToExecuteDependencies
): NextTaskResult | null {
    const { multiServerState } = deps;

    // First check for ready manual tasks
    const manualTask = findNextPendingManualTask(multiServerState);
    if (manualTask) {
        return manualTask;
    }

    // Find next regular task
    const regularTask = findNextRegularTask(multiServerState);

    return regularTask;
}


