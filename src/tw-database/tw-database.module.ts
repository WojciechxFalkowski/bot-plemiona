import { Module } from '@nestjs/common';
import { TwDatabaseService } from './tw-database.service';
import { TwDatabaseController } from './tw-database.controller';
import { FejkMethodsConfigService } from './fejk-methods-config.service';
import { twDatabaseProviders } from './tw-database.service.providers';
import { PlemionaCookiesModule } from '@/plemiona-cookies';
import { DatabaseModule } from '@/database/database.module';

/**
 * Module for TWDatabase (twdatabase.online) integration.
 * Attack Planner - scrape, filter, save to DB, navigate to Plemiona place.
 */
@Module({
    imports: [PlemionaCookiesModule, DatabaseModule],
    controllers: [TwDatabaseController],
    providers: [...twDatabaseProviders, FejkMethodsConfigService, TwDatabaseService],
    exports: [TwDatabaseService],
})
export class TwDatabaseModule {}
