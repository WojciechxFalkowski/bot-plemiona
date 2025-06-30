import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { BarbarianVillagesController } from './barbarian-villages.controller';
import { BarbarianVillagesService } from './barbarian-villages.service';
import { barbarianVillagesProviders } from './barbarian-villages.service.providers';

@Module({
  imports: [DatabaseModule, ConfigModule, SettingsModule],
  controllers: [BarbarianVillagesController],
  providers: [...barbarianVillagesProviders, BarbarianVillagesService],
  exports: [BarbarianVillagesService],
})
export class BarbarianVillagesModule {} 