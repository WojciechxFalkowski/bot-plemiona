import { Module } from '@nestjs/common';
import { ArmyTrainingService } from './army-training.service';
import { ArmyTrainingController } from './army-training.controller';
import { ServersModule } from '@/servers/servers.module';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [ServersModule, PlemionaCookiesModule, DatabaseModule],
  controllers: [ArmyTrainingController],
  providers: [ArmyTrainingService],
  exports: [ArmyTrainingService],
})
export class ArmyTrainingModule { }
