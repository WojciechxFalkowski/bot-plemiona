import { Repository } from 'typeorm';
import { SettingsEntity } from '../../settings.entity';
import { SettingsOperationDependencies } from '../query/get-setting.operation';

export interface DeleteAllSettingsForServerDependencies extends SettingsOperationDependencies {}

/**
 * Usuwa wszystkie ustawienia dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function deleteAllSettingsForServerOperation(
    serverId: number,
    deps: DeleteAllSettingsForServerDependencies
): Promise<void> {
    const { settingsRepository } = deps;
    await settingsRepository.delete({ serverId });
}

