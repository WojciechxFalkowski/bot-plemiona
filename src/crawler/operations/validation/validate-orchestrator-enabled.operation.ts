import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { Logger } from '@nestjs/common';

export interface ValidateOrchestratorEnabledDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

/**
 * Checks if orchestrator is enabled for a server
 * @param serverId ID of the server to check
 * @param deps Dependencies needed for validation
 * @returns true if orchestrator is enabled, false otherwise
 */
export async function validateOrchestratorEnabledOperation(
    serverId: number,
    deps: ValidateOrchestratorEnabledDependencies
): Promise<boolean> {
    const { settingsService, logger } = deps;

    try {
        const setting = await settingsService.getSetting<{ value: boolean }>(
            serverId,
            SettingsKey.CRAWLER_ORCHESTRATOR_ENABLED
        );
        return setting?.value === true;
    } catch (error) {
        logger.error(`Failed to check orchestrator setting for server ${serverId}:`, error);
        return false;
    }
}


