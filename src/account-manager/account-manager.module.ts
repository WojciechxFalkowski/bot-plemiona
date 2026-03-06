import { Module } from '@nestjs/common';
import { AccountManagerController } from './account-manager.controller';
import { CrawlerModule } from '../crawler/crawler.module';

@Module({
    imports: [CrawlerModule],
    controllers: [AccountManagerController],
    providers: [],
})
export class AccountManagerModule { }
