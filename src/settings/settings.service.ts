// settings.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SettingsEntity } from './settings.entity';
import { SettingsKey } from './settings-keys.enum';
import { SETTINGS_ENTITY_REPOSITORY } from './settings.service.contracts';
import {
    getSettingOperation,
    getAllSettingsForServerOperation,
    setSettingOperation,
    deleteSettingOperation,
    deleteAllSettingsForServerOperation,
    SettingsOperationDependencies
} from './operations';

@Injectable()
export class SettingsService {
    constructor(
        @Inject(SETTINGS_ENTITY_REPOSITORY)
        private readonly settingsRepo: Repository<SettingsEntity>,
    ) { }

    private getDependencies(): SettingsOperationDependencies {
        return {
            settingsRepository: this.settingsRepo
        };
    }

    async getSetting<T>(serverId: number, key: SettingsKey): Promise<T | null> {
        return getSettingOperation<T>(serverId, key, this.getDependencies());
    }

    async setSetting(serverId: number, key: SettingsKey, value: Record<string, any>): Promise<void> {
        return setSettingOperation(serverId, key, value, this.getDependencies());
    }

    async deleteSetting(serverId: number, key: SettingsKey): Promise<void> {
        return deleteSettingOperation(serverId, key, this.getDependencies());
    }

    async getAllSettingsForServer(serverId: number): Promise<SettingsEntity[]> {
        return getAllSettingsForServerOperation(serverId, this.getDependencies());
    }

    async deleteAllSettingsForServer(serverId: number): Promise<void> {
        return deleteAllSettingsForServerOperation(serverId, this.getDependencies());
    }
}
