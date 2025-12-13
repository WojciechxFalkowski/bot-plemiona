import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { calculateRandomMiniAttackIntervalOperation } from '../calculations/calculate-random-mini-attack-interval.operation';

export interface UpdateNextPlayerVillageAttackTimeDependencies {
    settingsService: any;
    logger: any;
}

export async function updateNextPlayerVillageAttackTimeOperation(
    plan: ServerCrawlerPlan,
    serverId: number,
    deps: UpdateNextPlayerVillageAttackTimeDependencies
): Promise<void> {
    const delay = await calculateRandomMiniAttackIntervalOperation(serverId, deps);
    plan.playerVillageAttacks.nextExecutionTime = new Date(Date.now() + delay);
    plan.playerVillageAttacks.lastExecuted = new Date();
    plan.playerVillageAttacks.lastAttackTime = new Date();
}


