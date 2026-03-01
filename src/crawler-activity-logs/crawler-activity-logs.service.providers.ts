import { DATA_SOURCE } from '@/database/database.contracts';
import { DataSource } from 'typeorm';
import { CrawlerActivityLogEntity } from './entities/crawler-activity-log.entity';
import { CRAWLER_ACTIVITY_LOG_ENTITY_REPOSITORY } from './crawler-activity-logs.service.contracts';

export const crawlerActivityLogsProviders = [
    {
        provide: CRAWLER_ACTIVITY_LOG_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(CrawlerActivityLogEntity),
        inject: [DATA_SOURCE],
    },
];
