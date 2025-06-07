import { Module } from '@nestjs/common';
import { VillageConstructionQueueController } from './village-construction-queue.controller';
import { VillageConstructionQueueService } from './village-construction-queue.service';
import { villageConstructionQueueProviders } from './village-construction-queue.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [DatabaseModule, ConfigModule],
    controllers: [VillageConstructionQueueController],
    providers: [...villageConstructionQueueProviders, VillageConstructionQueueService],
    exports: [VillageConstructionQueueService]
})
export class VillageConstructionQueueModule { } 