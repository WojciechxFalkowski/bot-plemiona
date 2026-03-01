import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { ServersModule } from '@/servers/servers.module';
import { CrawlerExecutionLogsService } from './crawler-execution-logs.service';
import { CrawlerExecutionLogsController } from './crawler-execution-logs.controller';
import { crawlerExecutionLogsProviders } from './crawler-execution-logs.service.providers';
import { CrawlerActivityLogsModule } from '@/crawler-activity-logs/crawler-activity-logs.module';

@Module({
  imports: [DatabaseModule, ServersModule, CrawlerActivityLogsModule],
  controllers: [CrawlerExecutionLogsController],
  providers: [...crawlerExecutionLogsProviders, CrawlerExecutionLogsService],
  exports: [CrawlerExecutionLogsService],
})
export class CrawlerExecutionLogsModule {}

