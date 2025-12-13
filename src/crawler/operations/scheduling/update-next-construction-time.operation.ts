import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { calculateRandomConstructionIntervalOperation } from '../calculations/calculate-random-construction-interval.operation';

export interface UpdateNextConstructionTimeDependencies {
    logger: Logger;
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
    const delay = calculateRandomConstructionIntervalOperation();
    plan.constructionQueue.nextExecutionTime = new Date(Date.now() + delay);
    plan.constructionQueue.lastExecuted = new Date();

    deps.logger.debug(`📅 Next construction queue for ${plan.serverCode}: ${plan.constructionQueue.nextExecutionTime.toLocaleString()}`);
}


