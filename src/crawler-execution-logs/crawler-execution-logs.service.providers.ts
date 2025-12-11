import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { CrawlerExecutionLogEntity } from './entities/crawler-execution-log.entity';
import { CRAWLER_EXECUTION_LOGS_ENTITY_REPOSITORY } from './crawler-execution-logs.service.contracts';

export const crawlerExecutionLogsProviders = [
  {
    provide: CRAWLER_EXECUTION_LOGS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(CrawlerExecutionLogEntity),
    inject: [DATA_SOURCE],
  }
];

