import { Inject, Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { GlobalSettingsEntity } from './global-settings.entity'
import { SettingsKey } from './settings-keys.enum'

export const GLOBAL_SETTINGS_ENTITY_REPOSITORY = 'GLOBAL_SETTINGS_ENTITY_REPOSITORY'

@Injectable()
export class GlobalSettingsService {
  constructor(
    @Inject(GLOBAL_SETTINGS_ENTITY_REPOSITORY)
    private readonly globalSettingsRepo: Repository<GlobalSettingsEntity>
  ) {}

  async getGlobalSetting<T>(key: SettingsKey): Promise<T | null> {
    const row = await this.globalSettingsRepo.findOne({ where: { key } })
    return (row?.value as T) ?? null
  }

  async setGlobalSetting(key: SettingsKey, value: Record<string, any>): Promise<void> {
    const existing = await this.globalSettingsRepo.findOne({ where: { key } })
    if (existing) {
      existing.value = value
      await this.globalSettingsRepo.save(existing)
      return
    }

    const entity = this.globalSettingsRepo.create({ key, value })
    await this.globalSettingsRepo.save(entity)
  }

  async deleteGlobalSetting(key: SettingsKey): Promise<void> {
    await this.globalSettingsRepo.delete({ key })
  }
}


