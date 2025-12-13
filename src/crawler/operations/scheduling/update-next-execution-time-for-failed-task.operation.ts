import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';

export interface UpdateNextExecutionTimeForFailedTaskDependencies {
    logger: any;
}

const RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

export function updateNextExecutionTimeForFailedTaskOperation(
    plan: ServerCrawlerPlan,
    taskType: string,
    deps: UpdateNextExecutionTimeForFailedTaskDependencies
): void {
    const retryDelay = RETRY_DELAY;

    switch (taskType) {
        case 'Construction Queue':
            plan.constructionQueue.nextExecutionTime = new Date(Date.now() + retryDelay);
            break;
        case 'Scavenging':
            plan.scavenging.nextExecutionTime = new Date(Date.now() + retryDelay);
            break;
        case 'Mini Attacks':
            plan.miniAttacks.nextExecutionTime = new Date(Date.now() + retryDelay);
            break;
        case 'Player Village Attacks':
            plan.playerVillageAttacks.nextExecutionTime = new Date(Date.now() + retryDelay);
            break;
        case 'Army Training':
            plan.armyTraining.nextExecutionTime = new Date(Date.now() + retryDelay);
            break;
    }

    deps.logger.log(`⏰ Updated next execution time for failed ${taskType} on server ${plan.serverCode}`);
}


