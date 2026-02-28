import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { calculateRandomTwDatabaseIntervalOperation } from '../calculations/calculate-random-tw-database-interval.operation';

/**
 * Updates next execution time for TW Database task.
 */
export function updateNextTwDatabaseTimeOperation(plan: ServerCrawlerPlan): void {
    const delay = calculateRandomTwDatabaseIntervalOperation();
    plan.twDatabase.nextExecutionTime = new Date(Date.now() + delay);
    plan.twDatabase.lastExecuted = new Date();
}
