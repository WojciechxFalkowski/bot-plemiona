import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { Logger } from '@nestjs/common';
import { minutesToMillisecondsOperation } from '../utilities/minutes-to-milliseconds.operation';

export interface GetMiniAttackIntervalsDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

export interface MiniAttackIntervals {
    minInterval: number; // in milliseconds
    maxInterval: number; // in milliseconds
}

const DEFAULT_MIN_MINI_ATTACK_INTERVAL = 1000 * 60 * 10; // 10 minutes
const DEFAULT_MAX_MINI_ATTACK_INTERVAL = 1000 * 60 * 15; // 15 minutes

/**
 * Gets minimum and maximum mini attack intervals from settings
 * @param serverId ID of the server
 * @param deps Dependencies needed for calculation
 * @returns Minimum and maximum intervals in milliseconds
 */
export async function getMiniAttackIntervalsOperation(
    serverId: number,
    deps: GetMiniAttackIntervalsDependencies
): Promise<MiniAttackIntervals> {
    const { settingsService, logger } = deps;

    try {
        const minIntervalSetting = await settingsService.getSetting<{ value: number }>(
            serverId,
            SettingsKey.MINI_ATTACKS_MIN_INTERVAL
        );
        const maxIntervalSetting = await settingsService.getSetting<{ value: number }>(
            serverId,
            SettingsKey.MINI_ATTACKS_MAX_INTERVAL
        );

        // Convert minutes to milliseconds
        const minMinutes = minIntervalSetting?.value || 10; // Default 10 minutes
        const maxMinutes = maxIntervalSetting?.value || 15; // Default 15 minutes

        return {
            minInterval: minutesToMillisecondsOperation(minMinutes),
            maxInterval: minutesToMillisecondsOperation(maxMinutes)
        };
    } catch (error) {
        logger.error(`Failed to get mini attack intervals for server ${serverId}:`, error);
        return {
            minInterval: DEFAULT_MIN_MINI_ATTACK_INTERVAL,
            maxInterval: DEFAULT_MAX_MINI_ATTACK_INTERVAL
        };
    }
}


