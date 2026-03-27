import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import type { ResolvedOrchestratorSchedulingConfig } from '@/crawler/scheduling-config/orchestrator-scheduling.types';
import { computeRepeatDelayMsFromSpec } from '@/crawler/scheduling-config/compute-repeat-delay-ms.operation';

export interface UpdateNextConstructionTimeDependencies {
    logger: Logger;
    scheduling: ResolvedOrchestratorSchedulingConfig;
}

/**
 * Updates next construction queue execution time
 * @param plan Server crawler plan to update
 * @param deps Dependencies needed for update
 */
export function updateNextConstructionTimeOperation(
    plan: ServerCrawlerPlan,
    deps: UpdateNextConstructionTimeDependencies
): void {
    const delay = computeRepeatDelayMsFromSpec(deps.scheduling.constructionQueue.repeat);
    plan.constructionQueue.nextExecutionTime = new Date(Date.now() + delay);
    plan.constructionQueue.lastExecuted = new Date();

    deps.logger.debug(`📅 Next construction queue for ${plan.serverCode}: ${plan.constructionQueue.nextExecutionTime.toLocaleString()}`);
}


