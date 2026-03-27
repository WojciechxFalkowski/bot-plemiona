import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import type { ResolvedOrchestratorSchedulingConfig } from '@/crawler/scheduling-config/orchestrator-scheduling.types';
import { computeRepeatDelayMsFromSpec } from '@/crawler/scheduling-config/compute-repeat-delay-ms.operation';

export interface UpdateNextPlayerVillageAttackTimeDependencies {
    logger: any;
    scheduling: ResolvedOrchestratorSchedulingConfig;
}

export async function updateNextPlayerVillageAttackTimeOperation(
    plan: ServerCrawlerPlan,
    serverId: number,
    deps: UpdateNextPlayerVillageAttackTimeDependencies
): Promise<void> {
    const delay = computeRepeatDelayMsFromSpec(deps.scheduling.playerVillageAttacks.repeat);
    plan.playerVillageAttacks.nextExecutionTime = new Date(Date.now() + delay);
    plan.playerVillageAttacks.lastExecuted = new Date();
    plan.playerVillageAttacks.lastAttackTime = new Date();
}


