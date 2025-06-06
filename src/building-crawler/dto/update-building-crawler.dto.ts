import { PartialType } from '@nestjs/swagger';
import { CreateBuildingCrawlerDto } from './create-building-crawler.dto';

export class UpdateBuildingCrawlerDto extends PartialType(CreateBuildingCrawlerDto) {}
