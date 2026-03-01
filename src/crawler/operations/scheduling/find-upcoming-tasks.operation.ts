import { MultiServerState, CrawlerTask } from '../query/get-multi-server-status.operation';

export interface UpcomingTaskItem {
    taskType: string;
    serverCode: string;
    inSeconds: number;
}

export interface FindUpcomingTasksDependencies {
    multiServerState: MultiServerState;
    limit?: number;
}

/**
 * Collects enabled regular tasks and pending manual tasks, sorted by execution time.
 * Returns up to limit items with taskType, serverCode, and inSeconds.
 */
export function findUpcomingTasksOperation(
    deps: FindUpcomingTasksDependencies
): UpcomingTaskItem[] {
    const { multiServerState, limit = 8 } = deps;
    const now = Date.now();
    const items: Array<{ taskType: string; serverCode: string; executionTime: number }> = [];

    for (const [, plan] of multiServerState.serverPlans) {
        const regularTasks: Array<{ task: CrawlerTask; type: string }> = [
            { task: plan.constructionQueue, type: 'Construction Queue' },
            { task: plan.scavenging, type: 'Scavenging' },
            { task: plan.miniAttacks, type: 'Mini Attacks' },
            { task: plan.playerVillageAttacks, type: 'Player Village Attacks' },
            { task: plan.armyTraining, type: 'Army Training' },
            { task: plan.twDatabase, type: 'TW Database' }
        ];
        for (const { task, type } of regularTasks) {
            if (task.enabled) {
                items.push({
                    taskType: type,
                    serverCode: plan.serverCode,
                    executionTime: task.nextExecutionTime.getTime()
                });
            }
        }
    }

    for (const task of multiServerState.manualTaskQueue) {
        if (task.status === 'pending') {
            const plan = multiServerState.serverPlans.get(task.serverId);
            const serverCode = plan ? plan.serverCode : `server ${task.serverId}`;
            items.push({
                taskType: `Manual: ${task.type}`,
                serverCode,
                executionTime: task.scheduledFor.getTime()
            });
        }
    }

    items.sort((a, b) => a.executionTime - b.executionTime);

    return items.slice(0, limit).map((item) => ({
        taskType: item.taskType,
        serverCode: item.serverCode,
        inSeconds: Math.max(0, Math.floor((item.executionTime - now) / 1000))
    }));
}
