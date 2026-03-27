import { SettingsKey } from '@/settings/settings-keys.enum';
import { SettingsService } from '@/settings/settings.service';

export interface ValidateAutoScavengingMassEnabledDependencies {
    settingsService: SettingsService;
}

/**
 * Returns true when mass scavenging (scavenge_mass) automation is enabled for the server.
 */
export async function validateAutoScavengingMassEnabledOperation(
    serverId: number,
    deps: ValidateAutoScavengingMassEnabledDependencies
): Promise<boolean> {
    const { settingsService } = deps;
    try {
        const setting = await settingsService.getSetting<{ value: boolean }>(
            serverId,
            SettingsKey.AUTO_SCAVENGING_MASS_ENABLED
        );
        return setting?.value ?? false;
    } catch {
        return false;
    }
}
