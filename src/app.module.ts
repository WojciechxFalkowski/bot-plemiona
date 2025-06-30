import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import configuration from './database/database-configuration';
import { CrawlerModule } from './crawler/crawler.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from './settings/settings.module';
import { BuildingCrawlerModule } from './building-crawler/building-crawler.module';
import { VillagesCrawlerModule } from './villages-crawler/villages-crawler.module';
import { VillagesModule } from './villages/villages.module';
import { VillageConstructionQueueModule } from './village-construction-queue/village-construction-queue.module';
import { ClerkAuthModule } from './clerk-auth/clerk-auth.module';
import { BarbarianVillagesModule } from './barbarian-villages/barbarian-villages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true, cache: true, }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CrawlerModule,
    SettingsModule,
    BuildingCrawlerModule,
    VillagesCrawlerModule,
    VillagesModule,
    VillageConstructionQueueModule,
    ClerkAuthModule,
    BarbarianVillagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
