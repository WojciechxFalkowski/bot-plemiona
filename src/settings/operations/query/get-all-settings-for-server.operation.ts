import { Repository } from 'typeorm';
import { SettingsEntity } from '../../settings.entity';
import { SettingsOperationDependencies } from './get-setting.operation';

export interface GetAllSettingsForServerDependencies extends SettingsOperationDependencies {}

/**
 * Pobiera wszystkie ustawienia dla danego serwera, posortowane po kluczu
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica encji ustawień posortowana po kluczu
 */
export async function getAllSettingsForServerOperation(
    serverId: number,
    deps: GetAllSettingsForServerDependencies
): Promise<SettingsEntity[]> {
    const { settingsRepository } = deps;
    return settingsRepository.find({
        where: { serverId },
        order: { key: 'ASC' }
    });
}

