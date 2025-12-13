import { MultiServerState, CrawlerTask } from '../query/get-multi-server-status.operation';

export interface FindNextTaskToExecuteDependencies {
    multiServerState: MultiServerState;
}

export interface NextTaskResult {
    task: CrawlerTask;
    serverId: number;
    taskType: string;
}

/**
 * Finds the next task to execute across all servers
 * @param deps Dependencies containing multi-server state
 * @returns Next task to execute or null if no tasks scheduled
 */
export function findNextTaskToExecuteOperation(
    deps: FindNextTaskToExecuteDependencies
): NextTaskResult | null {
    const { multiServerState } = deps;

    let earliestTask: NextTaskResult | null = null;
    let earliestTime = Number.MAX_SAFE_INTEGER;

    for (const [serverId, plan] of multiServerState.serverPlans) {
        const tasks = [
            { task: plan.constructionQueue, type: 'Construction Queue' },
            { task: plan.scavenging, type: 'Scavenging' },
            { task: plan.miniAttacks, type: 'Mini Attacks' },
            { task: plan.playerVillageAttacks, type: 'Player Village Attacks' },
            { task: plan.armyTraining, type: 'Army Training' }
        ];

        for (const { task, type } of tasks) {
            if (task.enabled && task.nextExecutionTime.getTime() < earliestTime) {
                earliestTime = task.nextExecutionTime.getTime();
                earliestTask = { task, serverId, taskType: type };
            }
        }
    }

    return earliestTask;
}


