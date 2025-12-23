import { Module, forwardRef } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { settingsProviders } from './settings.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { GlobalSettingsService } from './global-settings.service';
import { CrawlerModule } from '@/crawler/crawler.module';

@Module({
  imports: [DatabaseModule, ConfigModule, forwardRef(() => CrawlerModule)],
  controllers: [SettingsController],
  providers: [...settingsProviders, SettingsService, GlobalSettingsService],
  exports: [SettingsService, GlobalSettingsService],
})
export class SettingsModule { }
