import { Module } from '@nestjs/common';
import { ScavengingLimitsService } from './scavenging-limits.service';
import { ScavengingLimitsController } from './scavenging-limits.controller';
import { DatabaseModule } from '@/database/database.module';
import { scavengingLimitsProviders } from './scavenging-limits.providers';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [ScavengingLimitsController],
  providers: [...scavengingLimitsProviders, ScavengingLimitsService],
  exports: [ScavengingLimitsService],
})
export class ScavengingLimitsModule { }
