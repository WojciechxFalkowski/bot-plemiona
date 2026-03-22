import { MultiServerState, CrawlerTask, ManualTask } from '../query/get-multi-server-status.operation';
import { CrawlerStatusService } from '@/crawler/crawler-status.service';

export interface FindNextTaskToExecuteDependencies {
    multiServerState: MultiServerState;
    crawlerStatusService: CrawlerStatusService;
}

/**
 * Result type for regular (recurring) tasks
 */
export interface NextRegularTaskResult {
    task: CrawlerTask;
    serverId: number;
    taskType: string;
    isManualTask: false;
    isRecaptchaCheck: false;
}

/**
 * Result type for RecaptchaCheck task (blocked server check)
 */
export interface NextRecaptchaCheckTaskResult {
    serverId: number;
    taskType: 'Recaptcha Check';
    isManualTask: false;
    isRecaptchaCheck: true;
    nextCheckAt: Date;
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
export type NextTaskResult = NextRegularTaskResult | NextManualTaskResult | NextRecaptchaCheckTaskResult;

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
 * Finds the next RecaptchaCheck task for a blocked server (earliest due).
 * @param crawlerStatusService Service with recaptcha-blocked state
 * @returns RecaptchaCheck task or null if none due
 */
function findNextRecaptchaCheckTask(
    crawlerStatusService: CrawlerStatusService
): NextRecaptchaCheckTaskResult | null {
    const due = crawlerStatusService.getNextRecaptchaCheckDue();
    if (!due) return null;
    return {
        serverId: due.serverId,
        taskType: 'Recaptcha Check',
        isManualTask: false,
        isRecaptchaCheck: true,
        nextCheckAt: due.nextCheckAt
    };
}

/**
 * Finds the next regular task to execute across all servers.
 * Excludes servers in recaptchaBlockedServerIds.
 * @param multiServerState State containing server plans
 * @param recaptchaBlockedServerIds Set of server IDs blocked by reCAPTCHA
 * @returns Regular task result or null if no tasks scheduled
 */
function findNextRegularTask(
    multiServerState: MultiServerState,
    blockedServerIds: Set<number>
): NextRegularTaskResult | null {
    let earliestTask: NextRegularTaskResult | null = null;
    let earliestTime = Number.MAX_SAFE_INTEGER;

    for (const [serverId, plan] of multiServerState.serverPlans) {
        if (blockedServerIds.has(serverId)) continue;

        const tasks = [
            { task: plan.constructionQueue, type: 'Construction Queue' },
            { task: plan.scavenging, type: 'Scavenging' },
            { task: plan.miniAttacks, type: 'Mini Attacks' },
            { task: plan.playerVillageAttacks, type: 'Player Village Attacks' },
            { task: plan.armyTraining, type: 'Army Training' },
            { task: plan.twDatabase, type: 'TW Database' },
            { task: plan.accountManager, type: 'Account Manager' }
        ];

        for (const { task, type } of tasks) {
            if (task.enabled && task.nextExecutionTime.getTime() < earliestTime) {
                earliestTime = task.nextExecutionTime.getTime();
                earliestTask = { task, serverId, taskType: type, isManualTask: false, isRecaptchaCheck: false };
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
    const { multiServerState, crawlerStatusService } = deps;

    // 1. Manual tasks (highest priority)
    const manualTask = findNextPendingManualTask(multiServerState);
    if (manualTask) {
        return manualTask;
    }

    // 2. RecaptchaCheck for blocked servers
    const recaptchaTask = findNextRecaptchaCheckTask(crawlerStatusService);
    if (recaptchaTask) {
        return recaptchaTask;
    }

    // 3. Regular tasks (exclude blocked servers and servers with expired tokens)
    const status = crawlerStatusService.getStatus();
    const blockedServerIds = new Set([
        ...status.recaptchaBlockedServerIds,
        ...status.tokenExpiredServerIds
    ]);
    const regularTask = findNextRegularTask(multiServerState, blockedServerIds);

    return regularTask;
}


