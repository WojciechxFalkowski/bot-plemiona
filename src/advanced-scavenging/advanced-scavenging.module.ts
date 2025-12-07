import { Module, forwardRef } from '@nestjs/common';
import { AdvancedScavengingController } from './advanced-scavenging.controller';
import { AdvancedScavengingService } from './advanced-scavenging.service';
import { VillagesModule } from '@/villages/villages.module';
import { ServersModule } from '@/servers/servers.module';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { DatabaseModule } from '@/database/database.module';
import { CrawlerModule } from '@/crawler/crawler.module';
import { advancedScavengingProviders } from './advanced-scavenging.providers';

@Module({
  imports: [
    DatabaseModule,
    VillagesModule,
    ServersModule,
    PlemionaCookiesModule,
    forwardRef(() => CrawlerModule),
  ],
  controllers: [AdvancedScavengingController],
  providers: [...advancedScavengingProviders, AdvancedScavengingService],
  exports: [AdvancedScavengingService],
})
export class AdvancedScavengingModule {}

