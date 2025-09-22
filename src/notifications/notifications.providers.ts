import { DATA_SOURCE } from '@/database/database.contracts';
import { DataSource } from 'typeorm';
import { NOTIFICATIONS_ENTITY_REPOSITORY } from './player-villages.contracts';
import { FcmTokenEntity } from './entities/fcm-token.entity';

export const notificationsProviders = [
    {
        provide: NOTIFICATIONS_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(FcmTokenEntity),
        inject: [DATA_SOURCE],
    }
];
