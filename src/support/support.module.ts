import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { ServersModule } from '@/servers/servers.module';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { supportProviders } from './support.service.providers';
import { CrawlerModule } from '@/crawler/crawler.module';

/**
 * Module for sending support troops to target villages
 * Integrates with CrawlerOrchestratorService for coordinated task execution
 */
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ServersModule),
    PlemionaCookiesModule,
    forwardRef(() => CrawlerModule),
  ],
  controllers: [SupportController],
  providers: [...supportProviders, SupportService],
  exports: [SupportService],
})
export class SupportModule {}

