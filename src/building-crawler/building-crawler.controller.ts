import { Controller, Get, Post, Body, Delete, Param, HttpException, HttpStatus, Inject, Logger } from '@nestjs/common';
import { BuildingCrawlerService } from './building-crawler.service';
import { CreateBuildingCrawlerDto } from './dto/create-building-crawler.dto';
import { UpdateBuildingCrawlerDto } from './dto/update-building-crawler.dto';
import { BuildingQueueItem } from '../models/tribal-wars/building-queue-manager';
import { ApiOperation, ApiResponse as SwaggerApiResponse, ApiTags, ApiBody, ApiParam } from '@nestjs/swagger';
import { SuccessResponse } from '@/utils/response';

@Controller('building-crawler')
export class BuildingCrawlerController {
  private readonly logger = new Logger(BuildingCrawlerController.name);

  constructor(private readonly buildingCrawlerService: BuildingCrawlerService) { }

  /**
 * Add a building to the construction queue
 */
  // @Post('queue/add')
  // @ApiOperation({ summary: 'Add a building to the queue' })
  // @ApiBody({
  //   type: CreateBuildingCrawlerDto,
  //   description: 'Building to add to the queue',
  //   examples: {
  //     example1: {
  //       value: {
  //         "buildingId": "farm",
  //         "level": 12,
  //         "priority": 1,
  //         "village": "Moja Wioska"
  //       }
  //     },
  //     example2: {
  //       value: {
  //         "buildingId": "barracks",
  //         "level": 5,
  //         "priority": 2,
  //         "village": "12345"
  //       }
  //     }
  //   }
  // })
  // @SwaggerApiResponse({
  //   status: 200,
  //   description: 'Building added to queue',
  //   type: SuccessResponse
  // })
  // async addBuildingToQueue(@Body() createBuildingCrawlerDto: CreateBuildingCrawlerDto) {
  //   try {
  //     const { buildingId, level, priority, village } = createBuildingCrawlerDto;

  //     if (!buildingId || !level || priority === undefined || !village) {
  //       throw new HttpException(
  //         'buildingId, level, priority, and village are required',
  //         HttpStatus.BAD_REQUEST
  //       );
  //     }

  //     console.log(`Checking if village "${village}" exists and can build ${buildingId} level ${level}...`);
  //     this.buildingCrawlerService.addBuildingToQueue(buildingId, level, priority, village);
  //   } catch (error) {
  //     this.logger.error('Error adding building to queue', error);
  //     throw new HttpException('Failed to add building to queue', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // @Post()
  // create(@Body() createBuildingCrawlerDto: CreateBuildingCrawlerDto) {
  //   return this.buildingCrawlerService.create(createBuildingCrawlerDto);
  // }

  // @Get()
  // findAll() {
  //   return this.buildingCrawlerService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.buildingCrawlerService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateBuildingCrawlerDto: UpdateBuildingCrawlerDto) {
  //   return this.buildingCrawlerService.update(+id, updateBuildingCrawlerDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.buildingCrawlerService.remove(+id);
  // }
}
