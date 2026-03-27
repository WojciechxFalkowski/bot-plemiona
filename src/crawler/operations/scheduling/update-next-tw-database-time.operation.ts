import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import type { ResolvedOrchestratorSchedulingConfig } from '@/crawler/scheduling-config/orchestrator-scheduling.types';
import { computeRepeatDelayMsFromSpec } from '@/crawler/scheduling-config/compute-repeat-delay-ms.operation';

export interface UpdateNextTwDatabaseTimeDependencies {
    scheduling: ResolvedOrchestratorSchedulingConfig;
}

/**
 * Updates next execution time for TW Database task.
 */
export function updateNextTwDatabaseTimeOperation(plan: ServerCrawlerPlan, deps: UpdateNextTwDatabaseTimeDependencies): void {
    const delay = computeRepeatDelayMsFromSpec(deps.scheduling.twDatabase.repeat);
    plan.twDatabase.nextExecutionTime = new Date(Date.now() + delay);
    plan.twDatabase.lastExecuted = new Date();
}
