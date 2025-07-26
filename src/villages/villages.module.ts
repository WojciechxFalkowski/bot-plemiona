import { Module } from '@nestjs/common';
import { VillagesService } from './villages.service';
import { VillagesController } from './villages.controller';
import { villagesProviders } from './villages.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { SettingsModule } from '@/settings/settings.module';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { ServersModule } from '@/servers';

@Module({
	imports: [DatabaseModule, ConfigModule, SettingsModule, PlemionaCookiesModule, ServersModule],
	controllers: [VillagesController],
	providers: [...villagesProviders, VillagesService],
	exports: [VillagesService],
})
export class VillagesModule { } 