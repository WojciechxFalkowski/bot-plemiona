import { DATA_SOURCE } from '@/database/database.contracts';
import { DataSource } from 'typeorm';
import { PlayerVillageEntity } from './entities/player-village.entity';
import { PLAYER_VILLAGES_ENTITY_REPOSITORY } from './player-villages.service.contracts';

export const playerVillagesProviders = [
    {
        provide: PLAYER_VILLAGES_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(PlayerVillageEntity),
        inject: [DATA_SOURCE],
    }
];
  