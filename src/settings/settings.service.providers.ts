import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { SettingsEntity } from './settings.entity';
import { GlobalSettingsEntity } from './global-settings.entity';
import { GLOBAL_SETTINGS_ENTITY_REPOSITORY } from './global-settings.service';
import { SETTINGS_ENTITY_REPOSITORY } from './settings.service.contracts';

export const settingsProviders = [
  {
    provide: SETTINGS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(SettingsEntity),
    inject: [DATA_SOURCE],
  },
  {
    provide: GLOBAL_SETTINGS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(GlobalSettingsEntity),
    inject: [DATA_SOURCE],
  },
];
