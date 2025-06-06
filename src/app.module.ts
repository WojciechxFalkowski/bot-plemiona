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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
