import { SettingsKey } from '@/settings/settings-keys.enum';
import { SettingsService } from '@/settings/settings.service';

export interface ValidateAccountManagerEnabledDependencies {
    settingsService: SettingsService;
}

export async function validateAccountManagerEnabledOperation(
    serverId: number,
    deps: ValidateAccountManagerEnabledDependencies
): Promise<boolean> {
    const { settingsService } = deps;

    try {
        const setting = await settingsService.getSetting<{ value: boolean }>(
            serverId,
            SettingsKey.AUTO_ACCOUNT_MANAGER_ENABLED
        );
        return setting?.value ?? false;
    } catch {
        return false;
    }
}
