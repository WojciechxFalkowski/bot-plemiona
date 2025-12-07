import { DATA_SOURCE } from '@/database/database.contracts';
import { DataSource } from 'typeorm';
import { VillageScavengingUnitsConfigEntity } from './entities/village-scavenging-units-config.entity';
import { VILLAGE_SCAVENGING_UNITS_CONFIG_ENTITY_REPOSITORY } from './advanced-scavenging.contracts';

export const advancedScavengingProviders = [
  {
    provide: VILLAGE_SCAVENGING_UNITS_CONFIG_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(VillageScavengingUnitsConfigEntity),
    inject: [DATA_SOURCE],
  }
];

