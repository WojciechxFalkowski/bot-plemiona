import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { Logger } from '@nestjs/common';

export interface ValidateMiniAttacksEnabledDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

/**
 * Checks if mini attacks are enabled for a server
 * @param serverId ID of the server to check
 * @param deps Dependencies needed for validation
 * @returns true if mini attacks are enabled, false otherwise
 */
export async function validateMiniAttacksEnabledOperation(
    serverId: number,
    deps: ValidateMiniAttacksEnabledDependencies
): Promise<boolean> {
    const { settingsService, logger } = deps;

    try {
        const setting = await settingsService.getSetting<{ value: boolean }>(
            serverId,
            SettingsKey.MINI_ATTACKS_ENABLED
        );
        return setting?.value === true;
    } catch (error) {
        logger.error(`Failed to check mini attacks setting for server ${serverId}:`, error);
        return false;
    }
}


