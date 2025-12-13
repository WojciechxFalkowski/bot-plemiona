import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { calculateRandomMiniAttackIntervalOperation } from '../calculations/calculate-random-mini-attack-interval.operation';

export interface UpdateNextMiniAttackTimeDependencies {
    settingsService: any;
    logger: any;
}

export async function updateNextMiniAttackTimeOperation(
    plan: ServerCrawlerPlan,
    serverId: number,
    deps: UpdateNextMiniAttackTimeDependencies
): Promise<void> {
    const delay = await calculateRandomMiniAttackIntervalOperation(serverId, deps);
    plan.miniAttacks.nextExecutionTime = new Date(Date.now() + delay);
    plan.miniAttacks.lastExecuted = new Date();
    plan.miniAttacks.lastAttackTime = new Date();
}


