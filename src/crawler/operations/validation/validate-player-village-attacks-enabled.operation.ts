import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { Logger } from '@nestjs/common';

export interface ValidatePlayerVillageAttacksEnabledDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

/**
 * Checks if player village attacks are enabled for a server
 * @param serverId ID of the server to check
 * @param deps Dependencies needed for validation
 * @returns true if player village attacks are enabled, false otherwise
 */
export async function validatePlayerVillageAttacksEnabledOperation(
    serverId: number,
    deps: ValidatePlayerVillageAttacksEnabledDependencies
): Promise<boolean> {
    const { settingsService, logger } = deps;

    try {
        const setting = await settingsService.getSetting<{ value: boolean }>(
            serverId,
            SettingsKey.PLAYER_VILLAGE_ATTACKS_ENABLED
        );
        return setting?.value === true;
    } catch (error) {
        logger.error(`Failed to check player village attacks setting for server ${serverId}:`, error);
        return false;
    }
}


