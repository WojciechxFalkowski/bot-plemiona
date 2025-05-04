import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import configuration from './database/database-configuration';
import { CrawlerModule } from './crawler/crawler.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true, cache: true, }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CrawlerModule,
    SettingsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
