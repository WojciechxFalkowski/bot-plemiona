import { Module } from '@nestjs/common';
import { VillagesCrawlerService } from './villages-crawler.service';
import { VillagesCrawlerController } from './villages-crawler.controller';
import { SettingsModule } from '../settings/settings.module';
import { PlemionaCookiesModule } from '../plemiona-cookies';
import { ServersModule } from '@/servers';
@Module({
  imports: [SettingsModule, PlemionaCookiesModule, ServersModule],
  controllers: [VillagesCrawlerController],
  providers: [VillagesCrawlerService],
  exports: [VillagesCrawlerService]
})
export class VillagesCrawlerModule { }
