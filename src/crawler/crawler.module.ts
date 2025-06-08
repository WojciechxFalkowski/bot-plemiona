import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { BuildingCrawlerService } from './building-crawler.service';
import { BuildingCrawlerController } from './building-crawler.controller';
import { CrawlerOrchestratorService } from './crawler-orchestrator.service';
import { CrawlerOrchestratorController } from './crawler-orchestrator.controller';
import { SettingsModule } from '../settings/settings.module';
import { VillagesModule } from '../villages/villages.module';
import { VillageConstructionQueueModule } from '../village-construction-queue/village-construction-queue.module';

@Module({
  imports: [SettingsModule, VillagesModule, VillageConstructionQueueModule],
  controllers: [CrawlerController, BuildingCrawlerController, CrawlerOrchestratorController],
  providers: [CrawlerService, BuildingCrawlerService, CrawlerOrchestratorService],
  exports: [CrawlerService, BuildingCrawlerService, CrawlerOrchestratorService],
})
export class CrawlerModule { }
