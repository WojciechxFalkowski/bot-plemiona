import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { ServersModule } from '@/servers/servers.module';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { supportProviders } from './support.service.providers';

/**
 * Module for sending support troops to target villages
 */
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ServersModule),
    PlemionaCookiesModule,
  ],
  controllers: [SupportController],
  providers: [...supportProviders, SupportService],
  exports: [SupportService],
})
export class SupportModule {}

