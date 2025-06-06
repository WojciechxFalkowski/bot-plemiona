import { Module } from '@nestjs/common';
import { BuildingCrawlerService } from './building-crawler.service';
import { BuildingCrawlerController } from './building-crawler.controller';
import { VillagesCrawlerModule } from '@/villages-crawler/villages-crawler.module';

@Module({
  imports: [
    VillagesCrawlerModule
  ],
  controllers: [BuildingCrawlerController],
  providers: [BuildingCrawlerService],
  exports: [BuildingCrawlerService]
})
export class BuildingCrawlerModule { }
