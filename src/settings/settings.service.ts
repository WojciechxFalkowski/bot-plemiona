// settings.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SettingsEntity } from './settings.entity';
import { SettingsKey } from './settings-keys.enum';
import { SETTINGS_ENTITY_REPOSITORY } from './settings.service.contracts';

@Injectable()
export class SettingsService {
    constructor(
        @Inject(SETTINGS_ENTITY_REPOSITORY)
        private readonly settingsRepo: Repository<SettingsEntity>,
    ) { }

    async getSetting<T>(serverId: number, key: SettingsKey): Promise<T | null> {
        const setting = await this.settingsRepo.findOne({ 
            where: { serverId, key } 
        });
        return (setting?.value as T) ?? null;
    }

    async setSetting(serverId: number, key: SettingsKey, value: Record<string, any>): Promise<void> {
        let setting = await this.settingsRepo.findOne({ 
            where: { serverId, key } 
        });

        if (setting) {
            setting.value = value;
        } else {
            setting = this.settingsRepo.create({ serverId, key, value });
        }

        await this.settingsRepo.save(setting);
    }

    async deleteSetting(serverId: number, key: SettingsKey): Promise<void> {
        const result = await this.settingsRepo.delete({ serverId, key });
        
        if (result.affected === 0) {
            throw new NotFoundException(`Setting ${key} not found for server ${serverId}`);
        }
    }

    async getAllSettingsForServer(serverId: number): Promise<SettingsEntity[]> {
        return this.settingsRepo.find({ 
            where: { serverId },
            order: { key: 'ASC' }
        });
    }

    async deleteAllSettingsForServer(serverId: number): Promise<void> {
        await this.settingsRepo.delete({ serverId });
    }
}
