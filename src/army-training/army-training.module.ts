import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArmyTrainingService } from './army-training.service';
import { ArmyTrainingController } from './army-training.controller';
import { ArmyTrainingStrategiesService } from './army-training-strategies.service';
import { ArmyTrainingStrategiesController } from './army-training-strategies.controller';
import { ArmyTrainingStrategyEntity } from './entities/army-training-strategy.entity';
import { ServersModule } from '@/servers/servers.module';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { DatabaseModule } from '@/database/database.module';
import { armyTrainingStrategyProviders } from './army-training-strategy.providers';
import { VillagesModule } from '@/villages/villages.module';

@Module({
  imports: [
    DatabaseModule,
    ServersModule,
    PlemionaCookiesModule,
    VillagesModule,
  ],
  controllers: [ArmyTrainingController, ArmyTrainingStrategiesController],
  providers: [...armyTrainingStrategyProviders, ArmyTrainingService, ArmyTrainingStrategiesService],
  exports: [ArmyTrainingService, ArmyTrainingStrategiesService],
})
export class ArmyTrainingModule { }
