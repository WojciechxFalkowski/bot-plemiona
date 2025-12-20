import { DATA_SOURCE } from '@/database/database.contracts';
import { DataSource } from 'typeorm';
import { ScheduledAttackEntity } from './entities/scheduled-attack.entity';
import { SCHEDULED_ATTACKS_ENTITY_REPOSITORY } from './scheduled-attacks.service.contracts';

export const scheduledAttacksProviders = [
  {
    provide: SCHEDULED_ATTACKS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ScheduledAttackEntity),
    inject: [DATA_SOURCE],
  },
];

