import { Module } from '@nestjs/common';
import { VillagesCrawlerService } from './villages-crawler.service';
import { VillagesCrawlerController } from './villages-crawler.controller';
import { SettingsModule } from '../settings/settings.module';
@Module({
  imports: [SettingsModule],
  controllers: [VillagesCrawlerController],
  providers: [VillagesCrawlerService],
  exports: [VillagesCrawlerService]
})
export class VillagesCrawlerModule { }
