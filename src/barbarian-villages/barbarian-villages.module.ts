import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { BarbarianVillagesController } from './barbarian-villages.controller';
import { barbarianVillagesProviders } from './barbarian-villages.service.providers';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { ServersModule } from '@/servers';
import { BarbarianVillagesService } from './barbarian-villages.service';

@Module({
  imports: [DatabaseModule, ConfigModule, SettingsModule, PlemionaCookiesModule, ServersModule],
  controllers: [BarbarianVillagesController],
  providers: [...barbarianVillagesProviders, BarbarianVillagesService],
  exports: [BarbarianVillagesService],
})
export class BarbarianVillagesModule { } 