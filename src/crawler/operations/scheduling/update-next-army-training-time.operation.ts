import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import type { ResolvedOrchestratorSchedulingConfig } from '@/crawler/scheduling-config/orchestrator-scheduling.types';
import { computeRepeatDelayMsFromSpec } from '@/crawler/scheduling-config/compute-repeat-delay-ms.operation';

export interface UpdateNextArmyTrainingTimeDependencies {
    logger: any;
    scheduling: ResolvedOrchestratorSchedulingConfig;
}

export async function updateNextArmyTrainingTimeOperation(
    plan: ServerCrawlerPlan,
    serverId: number,
    deps: UpdateNextArmyTrainingTimeDependencies
): Promise<void> {
    const delay = computeRepeatDelayMsFromSpec(deps.scheduling.armyTraining.repeat);
    plan.armyTraining.nextExecutionTime = new Date(Date.now() + delay);
    plan.armyTraining.lastExecuted = new Date();
}


