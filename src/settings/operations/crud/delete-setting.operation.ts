import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SettingsEntity } from '../../settings.entity';
import { SettingsKey } from '../../settings-keys.enum';
import { SettingsOperationDependencies } from '../query/get-setting.operation';

export interface DeleteSettingDependencies extends SettingsOperationDependencies {}

/**
 * Usuwa ustawienie z bazy danych
 * @param serverId ID serwera
 * @param key Klucz ustawienia
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws NotFoundException jeśli ustawienie nie istnieje
 */
export async function deleteSettingOperation(
    serverId: number,
    key: SettingsKey,
    deps: DeleteSettingDependencies
): Promise<void> {
    const { settingsRepository } = deps;
    const result = await settingsRepository.delete({ serverId, key });
    if (result.affected === 0) {
        throw new NotFoundException(`Setting ${key} not found for server ${serverId}`);
    }
}

