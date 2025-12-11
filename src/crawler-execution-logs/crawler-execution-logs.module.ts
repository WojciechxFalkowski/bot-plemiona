import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { ServersModule } from '@/servers/servers.module';
import { CrawlerExecutionLogsService } from './crawler-execution-logs.service';
import { CrawlerExecutionLogsController } from './crawler-execution-logs.controller';
import { crawlerExecutionLogsProviders } from './crawler-execution-logs.service.providers';

@Module({
  imports: [DatabaseModule, ServersModule],
  controllers: [CrawlerExecutionLogsController],
  providers: [...crawlerExecutionLogsProviders, CrawlerExecutionLogsService],
  exports: [CrawlerExecutionLogsService],
})
export class CrawlerExecutionLogsModule {}

