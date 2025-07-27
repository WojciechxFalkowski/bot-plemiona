import { DataSource } from 'typeorm';
import { MiniAttackStrategyEntity } from './entities/mini-attack-strategy.entity';
import { DATA_SOURCE } from '@/database/database.contracts';
import { MINI_ATTACK_STRATEGIES_ENTITY_REPOSITORY } from './mini-attack-strategies.service.contracts';

export const miniAttackStrategiesProviders = [
    {
        provide: MINI_ATTACK_STRATEGIES_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(MiniAttackStrategyEntity),
        inject: [DATA_SOURCE],
    },
]; 