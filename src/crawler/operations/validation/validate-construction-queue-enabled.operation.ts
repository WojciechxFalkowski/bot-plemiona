import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { Logger } from '@nestjs/common';

export interface ValidateConstructionQueueEnabledDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

/**
 * Checks if construction queue processing is enabled for a server
 * @param serverId ID of the server to check
 * @param deps Dependencies needed for validation
 * @returns true if construction queue is enabled, false otherwise
 */
export async function validateConstructionQueueEnabledOperation(
    serverId: number,
    deps: ValidateConstructionQueueEnabledDependencies
): Promise<boolean> {
    const { settingsService, logger } = deps;

    try {
        const setting = await settingsService.getSetting<{ value: boolean }>(
            serverId,
            SettingsKey.AUTO_CONSTRUCTION_QUEUE_ENABLED
        );
        return setting?.value === true;
    } catch (error) {
        logger.error(`Failed to check construction queue setting for server ${serverId}:`, error);
        return false;
    }
}


