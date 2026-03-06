import { Logger } from '@nestjs/common';
import { getInitialIntervalsOperation } from './get-initial-intervals.operation';

export interface CalculateRandomAccountManagerIntervalDependencies {
    settingsService: any; // SettingsService
    logger: Logger;
}

export async function calculateRandomAccountManagerIntervalOperation(
    serverId: number,
    deps: CalculateRandomAccountManagerIntervalDependencies
): Promise<number> {
    // Default interval is 15 minutes since Account Manager runs sporadically
    // Later we can implement MIN/MAX settings like in mini attacks if needed.
    const defaultInterval = getInitialIntervalsOperation().accountManager || 15 * 60 * 1000;

    // Add ±10% random jitter
    const minMs = defaultInterval * 0.9;
    const maxMs = defaultInterval * 1.1;

    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}
