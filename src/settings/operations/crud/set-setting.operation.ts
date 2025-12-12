import { Repository } from 'typeorm';
import { SettingsEntity } from '../../settings.entity';
import { SettingsKey } from '../../settings-keys.enum';
import { SettingsOperationDependencies } from '../query/get-setting.operation';

export interface SetSettingDependencies extends SettingsOperationDependencies {}

/**
 * Tworzy nowe ustawienie lub aktualizuje istniejące (upsert)
 * @param serverId ID serwera
 * @param key Klucz ustawienia
 * @param value Wartość ustawienia
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function setSettingOperation(
    serverId: number,
    key: SettingsKey,
    value: Record<string, any>,
    deps: SetSettingDependencies
): Promise<void> {
    const { settingsRepository } = deps;
    let setting = await settingsRepository.findOne({
        where: { serverId, key }
    });
    if (setting) {
        setting.value = value;
    } else {
        setting = settingsRepository.create({ serverId, key, value });
    }
    await settingsRepository.save(setting);
}

