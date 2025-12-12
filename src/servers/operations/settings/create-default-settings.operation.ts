import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';

export interface CreateDefaultSettingsDependencies {
    settingsService: SettingsService;
}

/**
 * Tworzy domyślne ustawienia dla nowego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function createDefaultSettingsOperation(
    serverId: number,
    deps: CreateDefaultSettingsDependencies
): Promise<void> {
    const { settingsService } = deps;

    const defaultSettings = [
        { key: SettingsKey.PLEMIONA_COOKIES, value: [] },
        { key: SettingsKey.AUTO_SCAVENGING_ENABLED, value: { value: false } },
        { key: SettingsKey.AUTO_CONSTRUCTION_QUEUE_ENABLED, value: { value: false } },
        { key: SettingsKey.CRAWLER_ORCHESTRATOR_ENABLED, value: { value: false } },
        { key: SettingsKey.MINI_ATTACKS_ENABLED, value: { value: false } },
        { key: SettingsKey.MINI_ATTACKS_VILLAGE_ID, value: { value: null } },
        { key: SettingsKey.MINI_ATTACKS_MIN_INTERVAL, value: { value: 10 } }, // 10 minutes
        { key: SettingsKey.MINI_ATTACKS_MAX_INTERVAL, value: { value: 15 } }, // 15 minutes
    ];

    // Tworzenie ustawień równolegle dla lepszej wydajności
    await Promise.all(
        defaultSettings.map(setting =>
            settingsService.setSetting(serverId, setting.key, setting.value)
        )
    );
}

