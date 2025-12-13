import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { Logger } from '@nestjs/common';

export interface ValidateArmyTrainingEnabledDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

/**
 * Checks if army training is enabled for a server
 * @param serverId ID of the server to check
 * @param deps Dependencies needed for validation
 * @returns true if army training is enabled, false otherwise
 */
export async function validateArmyTrainingEnabledOperation(
    serverId: number,
    deps: ValidateArmyTrainingEnabledDependencies
): Promise<boolean> {
    const { settingsService, logger } = deps;

    try {
        const setting = await settingsService.getSetting<{ value: boolean }>(
            serverId,
            SettingsKey.AUTO_ARMY_TRAINING_LIGHT_ENABLED
        );
        return setting?.value === true;
    } catch (error) {
        logger.error(`Failed to check army training setting for server ${serverId}:`, error);
        return false;
    }
}


