import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { VillageConstructionQueueEntity } from './entities/village-construction-queue.entity';
import { VillageEntity } from '../villages/entities/village.entity';
import { VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY } from './village-construction-queue.service.contracts';
import { VILLAGES_ENTITY_REPOSITORY } from '../villages/villages.service.contracts';

export const villageConstructionQueueProviders = [
    {
        provide: VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(VillageConstructionQueueEntity),
        inject: [DATA_SOURCE],
    },
    {
        provide: VILLAGES_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(VillageEntity),
        inject: [DATA_SOURCE],
    }
]; 