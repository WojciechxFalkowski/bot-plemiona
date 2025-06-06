import { PartialType } from '@nestjs/swagger';
import { CreateVillagesCrawlerDto } from './create-villages-crawler.dto';

export class UpdateVillagesCrawlerDto extends PartialType(CreateVillagesCrawlerDto) {}
