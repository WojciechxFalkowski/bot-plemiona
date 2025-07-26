import { Module } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { serversProviders } from './servers.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { SettingsModule } from '@/settings/settings.module';

@Module({
  imports: [DatabaseModule, SettingsModule],
  controllers: [ServersController],
  providers: [...serversProviders, ServersService],
  exports: [ServersService],
})
export class ServersModule { } 