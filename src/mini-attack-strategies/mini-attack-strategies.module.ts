import { Module } from '@nestjs/common';
import { MiniAttackStrategiesService } from './mini-attack-strategies.service';
import { MiniAttackStrategiesController } from './mini-attack-strategies.controller';
import { miniAttackStrategiesProviders } from './mini-attack-strategies.service.providers';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MiniAttackStrategiesController],
  providers: [...miniAttackStrategiesProviders, MiniAttackStrategiesService],
  exports: [MiniAttackStrategiesService],
})
export class MiniAttackStrategiesModule { } 