import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { CrawlerOrchestratorService } from './crawler-orchestrator.service';
import { CrawlerOrchestratorController } from './crawler-orchestrator.controller';
import { SettingsModule } from '../settings/settings.module';
import { ServersModule } from '../servers/servers.module';
import { VillagesModule } from '../villages/villages.module';
import { VillageConstructionQueueModule } from '../village-construction-queue/village-construction-queue.module';
import { BarbarianVillagesModule } from '../barbarian-villages/barbarian-villages.module';
import { PlemionaCookiesModule } from '../plemiona-cookies';
import { MiniAttackStrategiesModule } from '@/mini-attack-strategies/mini-attack-strategies.module';

@Module({
  imports: [SettingsModule, ServersModule, VillagesModule, VillageConstructionQueueModule, BarbarianVillagesModule, PlemionaCookiesModule, MiniAttackStrategiesModule],
  controllers: [CrawlerController, CrawlerOrchestratorController],
  providers: [CrawlerService, CrawlerOrchestratorService],
  exports: [CrawlerService, CrawlerOrchestratorService],
})
export class CrawlerModule { }
