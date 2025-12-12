import { Repository } from 'typeorm';
import { SettingsEntity } from '../../settings.entity';
import { SettingsKey } from '../../settings-keys.enum';

export interface SettingsOperationDependencies {
    settingsRepository: Repository<SettingsEntity>;
}

export interface GetSettingDependencies extends SettingsOperationDependencies {}

/**
 * Pobiera ustawienie z bazy danych dla danego serwera i klucza
 * @param serverId ID serwera
 * @param key Klucz ustawienia
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wartość ustawienia jako typ T lub null jeśli nie istnieje
 */
export async function getSettingOperation<T>(
    serverId: number,
    key: SettingsKey,
    deps: GetSettingDependencies
): Promise<T | null> {
    const { settingsRepository } = deps;
    const setting = await settingsRepository.findOne({
        where: { serverId, key }
    });
    return (setting?.value as T) ?? null;
}

