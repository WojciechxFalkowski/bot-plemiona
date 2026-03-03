import { Logger } from '@nestjs/common';
import { MultiServerState, ServerCrawlerPlan } from '../query/get-multi-server-status.operation';

export interface ResetServerPlanExecutionTimesDependencies {
    multiServerState: MultiServerState;
    logger: Logger;
}

export interface ResetServerPlanExecutionTimesOptions {
    /** Delay in ms before next execution (default: 0 - immediate) */
    delayMs?: number;
}

/**
 * Resets nextExecutionTime for all task types in a server plan.
 * Used after RecaptchaCheck succeeds to schedule regular tasks to run soon.
 *
 * @param serverId Server ID whose plan to reset
 * @param deps Dependencies containing multi-server state
 * @param options Optional delay (default 0 for immediate re-scheduling)
 */
export function resetServerPlanExecutionTimesOperation(
    serverId: number,
    deps: ResetServerPlanExecutionTimesDependencies,
    options?: ResetServerPlanExecutionTimesOptions
): void {
    const { multiServerState, logger } = deps;
    const delayMs = options?.delayMs ?? 0;
    const plan = multiServerState.serverPlans.get(serverId);

    if (!plan) {
        logger.warn(`Cannot reset plan for server ${serverId}: plan not found`);
        return;
    }

    const baseTime = Date.now() + delayMs;

    const taskTypes: Array<keyof Pick<ServerCrawlerPlan, 'constructionQueue' | 'scavenging' | 'miniAttacks' | 'playerVillageAttacks' | 'armyTraining' | 'twDatabase'>> = [
        'constructionQueue',
        'scavenging',
        'miniAttacks',
        'playerVillageAttacks',
        'armyTraining',
        'twDatabase'
    ];

    for (const key of taskTypes) {
        const task = plan[key];
        if (task && typeof task === 'object' && 'nextExecutionTime' in task) {
            task.nextExecutionTime = new Date(baseTime);
        }
    }

    logger.log(`🔄 Reset execution times for ${plan.serverCode} (server ${serverId}) - next run in ${delayMs}ms`);
}
