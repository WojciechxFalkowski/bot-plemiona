import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { VillageEntity } from './villages.entity';
import { VILLAGES_ENTITY_REPOSITORY } from './villages.service.contracts';

export const villagesProviders = [
  {
    provide: VILLAGES_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(VillageEntity),
    inject: [DATA_SOURCE],
  }
]; 