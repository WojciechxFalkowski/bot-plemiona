import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import configuration from './database/database-configuration';
import { CrawlerModule } from './crawler/crawler.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from './settings/settings.module';
import { VillagesCrawlerModule } from './villages-crawler/villages-crawler.module';
import { VillagesModule } from './villages/villages.module';
import { VillageConstructionQueueModule } from './village-construction-queue/village-construction-queue.module';
import { ClerkAuthModule } from './clerk-auth/clerk-auth.module';
import { BarbarianVillagesModule } from './barbarian-villages/barbarian-villages.module';
import { BuildingsModule } from './buildings/buildings.module';
import { ServersModule } from './servers/servers.module';
import { PlemionaCookiesModule } from './plemiona-cookies';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true, cache: true, }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CrawlerModule,
    SettingsModule,
    VillagesCrawlerModule,
    VillagesModule,
    VillageConstructionQueueModule,
    ClerkAuthModule,
    BarbarianVillagesModule,
    BuildingsModule,
    ServersModule,
		PlemionaCookiesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
