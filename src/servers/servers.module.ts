import { Module, forwardRef } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { serversProviders } from './servers.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { SettingsModule } from '@/settings/settings.module';
import { CrawlerModule } from '@/crawler/crawler.module';

@Module({
  imports: [DatabaseModule, SettingsModule, forwardRef(() => CrawlerModule)],
  controllers: [ServersController],
  providers: [...serversProviders, ServersService],
  exports: [ServersService],
})
export class ServersModule { } 