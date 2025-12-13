import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { Logger } from '@nestjs/common';

export interface ValidateAutoScavengingEnabledDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

/**
 * Checks if auto-scavenging is enabled in settings for a server
 * @param serverId ID of the server to check
 * @param deps Dependencies needed for validation
 * @returns true if auto-scavenging is enabled, false otherwise
 */
export async function validateAutoScavengingEnabledOperation(
    serverId: number,
    deps: ValidateAutoScavengingEnabledDependencies
): Promise<boolean> {
    const { settingsService, logger } = deps;

    try {
        const setting = await settingsService.getSetting<{ value: boolean }>(
            serverId,
            SettingsKey.AUTO_SCAVENGING_ENABLED
        );
        return setting?.value === true;
    } catch (error) {
        logger.error('Failed to check auto-scavenging setting:', error);
        return false; // Default to disabled on error
    }
}


