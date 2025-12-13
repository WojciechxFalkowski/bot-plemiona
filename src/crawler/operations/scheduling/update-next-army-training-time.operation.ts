import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { calculateRandomArmyTrainingIntervalOperation } from '../calculations/calculate-random-army-training-interval.operation';

export interface UpdateNextArmyTrainingTimeDependencies {
    settingsService: any;
    logger: any;
}

export async function updateNextArmyTrainingTimeOperation(
    plan: ServerCrawlerPlan,
    serverId: number,
    deps: UpdateNextArmyTrainingTimeDependencies
): Promise<void> {
    const delay = await calculateRandomArmyTrainingIntervalOperation(serverId, deps);
    plan.armyTraining.nextExecutionTime = new Date(Date.now() + delay);
    plan.armyTraining.lastExecuted = new Date();
}


