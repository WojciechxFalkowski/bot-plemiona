import { DATA_SOURCE } from '@/database/database.contracts';
import { DataSource } from 'typeorm';
import { TwDatabaseAttackEntity } from './entities/tw-database-attack.entity';
import { TW_DATABASE_ATTACK_ENTITY_REPOSITORY } from './tw-database.service.contracts';

export const twDatabaseProviders = [
    {
        provide: TW_DATABASE_ATTACK_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(TwDatabaseAttackEntity),
        inject: [DATA_SOURCE],
    },
];
