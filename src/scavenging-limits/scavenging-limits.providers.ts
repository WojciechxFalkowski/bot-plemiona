import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { ScavengingLimitEntity } from './entities/scavenging-limit.entity';
import { ServerScavengingLimitEntity } from './entities/server-scavenging-limit.entity';
import { SCAVENGING_LIMITS_ENTITY_REPOSITORY, SERVER_SCAVENGING_LIMITS_ENTITY_REPOSITORY } from './scavenging-limits.contracts';

export const scavengingLimitsProviders = [
  {
    provide: SCAVENGING_LIMITS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ScavengingLimitEntity),
    inject: [DATA_SOURCE],
  },
  {
    provide: SERVER_SCAVENGING_LIMITS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ServerScavengingLimitEntity),
    inject: [DATA_SOURCE],
  },
];
