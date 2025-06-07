import { Module } from '@nestjs/common';
import { VillageConstructionQueueController } from './village-construction-queue.controller';
import { VillageConstructionQueueService } from './village-construction-queue.service';
import { villageConstructionQueueProviders } from './village-construction-queue.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { SettingsModule } from '@/settings/settings.module';
import { VillagesModule } from '@/villages/villages.module';

@Module({
    imports: [DatabaseModule, ConfigModule, SettingsModule, VillagesModule],
    controllers: [VillageConstructionQueueController],
    providers: [...villageConstructionQueueProviders, VillageConstructionQueueService],
    exports: [VillageConstructionQueueService]
})
export class VillageConstructionQueueModule { } 