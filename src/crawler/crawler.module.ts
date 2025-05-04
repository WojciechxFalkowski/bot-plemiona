import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [CrawlerController],
  providers: [CrawlerService],
  exports: [CrawlerService]
})
export class CrawlerModule { }
