import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { calculateRandomAccountManagerIntervalOperation } from '../calculations/calculate-random-account-manager-interval.operation';

export interface UpdateNextAccountManagerTimeDependencies {
    settingsService: any; // SettingsService
    logger: Logger;
}

export async function updateNextAccountManagerTimeOperation(
    plan: ServerCrawlerPlan,
    serverId: number,
    deps: UpdateNextAccountManagerTimeDependencies
): Promise<void> {
    const { logger } = deps;
    const delay = await calculateRandomAccountManagerIntervalOperation(serverId, deps);
    plan.accountManager.nextExecutionTime = new Date(Date.now() + delay);
    plan.accountManager.lastExecuted = new Date();
    logger.log(`⏰ Next Account Manager for server ${plan.serverCode} scheduled for ${plan.accountManager.nextExecutionTime.toLocaleString()} (in ${Math.round(delay / 1000)}s)`);
}
