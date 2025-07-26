import { Module } from '@nestjs/common';
import { PlemionaCookiesService } from './plemiona-cookies.service';
import { PlemionaCookiesController } from './plemiona-cookies.controller';
import { PlemionaCookiesProviders } from './plemiona-cookies.service.providers';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PlemionaCookiesController],
  providers: [...PlemionaCookiesProviders, PlemionaCookiesService],
  exports: [PlemionaCookiesService],
})
export class PlemionaCookiesModule { } 