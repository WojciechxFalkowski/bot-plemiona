import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { ServersModule } from '@/servers/servers.module';
import { CrawlerActivityLogsService } from './crawler-activity-logs.service';
import { crawlerActivityLogsProviders } from './crawler-activity-logs.service.providers';

@Module({
    imports: [DatabaseModule, ServersModule],
    providers: [...crawlerActivityLogsProviders, CrawlerActivityLogsService],
    exports: [CrawlerActivityLogsService],
})
export class CrawlerActivityLogsModule {}
