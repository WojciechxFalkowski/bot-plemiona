import { DATA_SOURCE } from '@/database/database.contracts';
import { DataSource } from 'typeorm';
import { PlayerVillageAttackStrategyEntity } from './entities/player-village-attack-strategy.entity';
import { PLAYER_VILLAGE_ATTACK_STRATEGIES_ENTITY_REPOSITORY } from './player-village-attack-strategies.service.contracts';

export const playerVillageAttackStrategiesProviders = [
    {
        provide: PLAYER_VILLAGE_ATTACK_STRATEGIES_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(PlayerVillageAttackStrategyEntity),
        inject: [DATA_SOURCE],
    }
];
