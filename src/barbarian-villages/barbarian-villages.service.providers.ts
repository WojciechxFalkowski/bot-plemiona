import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { BarbarianVillageEntity } from './entities/barbarian-village.entity';
import { BARBARIAN_VILLAGES_ENTITY_REPOSITORY } from './barbarian-villages.service.contracts';

export const barbarianVillagesProviders = [
  {
    provide: BARBARIAN_VILLAGES_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(BarbarianVillageEntity),
    inject: [DATA_SOURCE],
  }
]; 