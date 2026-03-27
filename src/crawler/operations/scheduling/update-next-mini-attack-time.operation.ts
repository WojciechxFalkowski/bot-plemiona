import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import type { ResolvedOrchestratorSchedulingConfig } from '@/crawler/scheduling-config/orchestrator-scheduling.types';
import { computeRepeatDelayMsFromSpec } from '@/crawler/scheduling-config/compute-repeat-delay-ms.operation';

export interface UpdateNextMiniAttackTimeDependencies {
    logger: any;
    scheduling: ResolvedOrchestratorSchedulingConfig;
}

export async function updateNextMiniAttackTimeOperation(
    plan: ServerCrawlerPlan,
    serverId: number,
    deps: UpdateNextMiniAttackTimeDependencies
): Promise<void> {
    const delay = computeRepeatDelayMsFromSpec(deps.scheduling.miniAttacks.repeat);
    plan.miniAttacks.nextExecutionTime = new Date(Date.now() + delay);
    plan.miniAttacks.lastExecuted = new Date();
    plan.miniAttacks.lastAttackTime = new Date();
}


