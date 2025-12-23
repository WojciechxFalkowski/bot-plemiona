import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { BarbarianVillagesController } from './barbarian-villages.controller';
import { barbarianVillagesProviders } from './barbarian-villages.service.providers';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { ServersModule } from '@/servers';
import { MiniAttackStrategiesModule } from '@/mini-attack-strategies';
import { BarbarianVillagesService } from './barbarian-villages.service';
import { BulkBarbarianVillagesService } from './bulk-barbarian-villages/bulk-barbarian-villages.service';

@Module({
  imports: [DatabaseModule, ConfigModule, SettingsModule, PlemionaCookiesModule, forwardRef(() => ServersModule), MiniAttackStrategiesModule],
  controllers: [BarbarianVillagesController],
  providers: [...barbarianVillagesProviders, BarbarianVillagesService, BulkBarbarianVillagesService],
  exports: [BarbarianVillagesService],
})
export class BarbarianVillagesModule { } 