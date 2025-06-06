import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { BuildingCrawlerService } from './building-crawler.service';
import { BuildingCrawlerController } from './building-crawler.controller';
import { SettingsModule } from '../settings/settings.module';
import { VillagesModule } from '../villages/villages.module';

@Module({
  imports: [SettingsModule, VillagesModule],
  controllers: [CrawlerController, BuildingCrawlerController],
  providers: [CrawlerService, BuildingCrawlerService],
  exports: [CrawlerService, BuildingCrawlerService],
})
export class CrawlerModule { }
