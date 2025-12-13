import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { Logger } from '@nestjs/common';

export interface CalculateRandomArmyTrainingIntervalDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

const DEFAULT_MIN_ARMY_TRAINING_INTERVAL = 1000 * 60 * 10; // 10 minutes
const DEFAULT_MAX_ARMY_TRAINING_INTERVAL = 1000 * 60 * 15; // 15 minutes

/**
 * Generates random interval for army training based on settings
 * @param serverId ID of the server
 * @param deps Dependencies needed for calculation
 * @returns Random interval in milliseconds
 */
export async function calculateRandomArmyTrainingIntervalOperation(
    serverId: number,
    deps: CalculateRandomArmyTrainingIntervalDependencies
): Promise<number> {
    const { settingsService, logger } = deps;

    try {
        const minIntervalSetting = await settingsService.getSetting<{ value: number }>(
            serverId,
            SettingsKey.ARMY_TRAINING_MIN_INTERVAL
        );
        const maxIntervalSetting = await settingsService.getSetting<{ value: number }>(
            serverId,
            SettingsKey.ARMY_TRAINING_MAX_INTERVAL
        );

        const minInterval = minIntervalSetting?.value || DEFAULT_MIN_ARMY_TRAINING_INTERVAL;
        const maxInterval = maxIntervalSetting?.value || DEFAULT_MAX_ARMY_TRAINING_INTERVAL;

        return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    } catch (error) {
        logger.error(`Failed to get army training interval settings for server ${serverId}:`, error);
        return Math.floor(Math.random() * (DEFAULT_MAX_ARMY_TRAINING_INTERVAL - DEFAULT_MIN_ARMY_TRAINING_INTERVAL + 1)) + DEFAULT_MIN_ARMY_TRAINING_INTERVAL;
    }
}


