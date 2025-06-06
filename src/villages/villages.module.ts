import { Module } from '@nestjs/common';
import { VillagesService } from './villages.service';
import { VillagesController } from './villages.controller';
import { villagesProviders } from './villages.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { SettingsModule } from '@/settings/settings.module';

@Module({
	imports: [DatabaseModule, ConfigModule, SettingsModule],
	controllers: [VillagesController],
	providers: [...villagesProviders, VillagesService],
	exports: [VillagesService],
})
export class VillagesModule { } 