// settings.service.ts
import { Inject, Injectable } from '@nestjs/common';
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

    async getSetting<T>(key: SettingsKey): Promise<T | null> {
        const setting = await this.settingsRepo.findOne({ where: { key } });
        return (setting?.value as T) ?? null;
    }

    async setSetting(key: SettingsKey, value: Record<string, any>): Promise<void> {
        let setting = await this.settingsRepo.findOne({ where: { key } });

        if (setting) {
            setting.value = value;
        } else {
            setting = this.settingsRepo.create({ key, value });
        }

        await this.settingsRepo.save(setting);
    }

    async deleteSetting(key: SettingsKey): Promise<void> {
        await this.settingsRepo.delete({ key });
    }
}
