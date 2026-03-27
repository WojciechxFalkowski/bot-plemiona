import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import type { ResolvedOrchestratorSchedulingConfig } from '@/crawler/scheduling-config/orchestrator-scheduling.types';
import { computeRepeatDelayMsFromSpec } from '@/crawler/scheduling-config/compute-repeat-delay-ms.operation';

export interface UpdateNextMassScavengingTimeDependencies {
    logger: Logger;
    scheduling: ResolvedOrchestratorSchedulingConfig;
}

/**
 * Schedules next mass scavenging run using base interval plus small random jitter.
 */
export function updateNextMassScavengingTimeOperation(
    plan: ServerCrawlerPlan,
    deps: UpdateNextMassScavengingTimeDependencies
): void {
    const { logger } = deps;
    const delayMs = computeRepeatDelayMsFromSpec(deps.scheduling.massScavenging.repeat);
    plan.massScavenging.nextExecutionTime = new Date(Date.now() + delayMs);
    plan.massScavenging.lastExecuted = new Date();
    logger.log(
        `⏰ Next Mass Scavenging for server ${plan.serverCode}: ` +
            `${plan.massScavenging.nextExecutionTime.toLocaleString()} (in ${Math.round(delayMs / 1000)}s)`
    );
}
