import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import type { ResolvedOrchestratorSchedulingConfig } from '@/crawler/scheduling-config/orchestrator-scheduling.types';
import { computeRepeatDelayMsFromSpec } from '@/crawler/scheduling-config/compute-repeat-delay-ms.operation';

export interface UpdateNextAccountManagerTimeDependencies {
    logger: Logger;
    scheduling: ResolvedOrchestratorSchedulingConfig;
}

export async function updateNextAccountManagerTimeOperation(
    plan: ServerCrawlerPlan,
    serverId: number,
    deps: UpdateNextAccountManagerTimeDependencies
): Promise<void> {
    const { logger } = deps;
    const delay = computeRepeatDelayMsFromSpec(deps.scheduling.accountManager.repeat);
    plan.accountManager.nextExecutionTime = new Date(Date.now() + delay);
    plan.accountManager.lastExecuted = new Date();
    logger.log(`⏰ Next Account Manager for server ${plan.serverCode} scheduled for ${plan.accountManager.nextExecutionTime.toLocaleString()} (in ${Math.round(delay / 1000)}s)`);
}
