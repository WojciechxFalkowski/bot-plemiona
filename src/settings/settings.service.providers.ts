import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { SettingsEntity } from './settings.entity';
import { SETTINGS_ENTITY_REPOSITORY } from './settings.service.contracts';

export const settingsProviders = [
  {
    provide: SETTINGS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(SettingsEntity),
    inject: [DATA_SOURCE],
  }
];
