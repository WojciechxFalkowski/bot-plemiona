import { Module } from '@nestjs/common';
import { ScheduledAttacksController } from './scheduled-attacks.controller';
import { ScheduledAttacksService } from './scheduled-attacks.service';
import { scheduledAttacksProviders } from './scheduled-attacks.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ServersModule } from '@/servers/servers.module';

@Module({
  imports: [DatabaseModule, ServersModule],
  controllers: [ScheduledAttacksController],
  providers: [...scheduledAttacksProviders, ScheduledAttacksService],
  exports: [ScheduledAttacksService],
})
export class ScheduledAttacksModule {}
