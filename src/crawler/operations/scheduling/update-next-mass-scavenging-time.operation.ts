import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { getInitialIntervalsOperation } from '../calculations/get-initial-intervals.operation';

export interface UpdateNextMassScavengingTimeDependencies {
    logger: Logger;
}

/**
 * Schedules next mass scavenging run using base interval plus small random jitter.
 */
export function updateNextMassScavengingTimeOperation(
    plan: ServerCrawlerPlan,
    deps: UpdateNextMassScavengingTimeDependencies
): void {
    const { logger } = deps;
    const baseMs = getInitialIntervalsOperation().massScavenging;
    const jitterMs = Math.floor(Math.random() * 60_000);
    const delayMs = baseMs + jitterMs;
    plan.massScavenging.nextExecutionTime = new Date(Date.now() + delayMs);
    plan.massScavenging.lastExecuted = new Date();
    logger.log(
        `⏰ Next Mass Scavenging for server ${plan.serverCode}: ` +
            `${plan.massScavenging.nextExecutionTime.toLocaleString()} (in ${Math.round(delayMs / 1000)}s)`
    );
}
