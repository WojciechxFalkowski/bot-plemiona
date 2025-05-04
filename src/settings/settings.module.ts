import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { settingsProviders } from './settings.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [SettingsController],
  providers: [...settingsProviders, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule { }
