import { VillagesCrawlerService } from './villages-crawler.service';
import { CreateVillagesCrawlerDto } from './dto/create-villages-crawler.dto';
import { UpdateVillagesCrawlerDto } from './dto/update-villages-crawler.dto';

import { Controller, Post, Logger, Body, BadRequestException, InternalServerErrorException, NotFoundException, HttpException, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';

@Controller('villages-crawler')
export class VillagesCrawlerController {
  private readonly logger = new Logger(VillagesCrawlerController.name);

  constructor(private readonly villagesCrawlerService: VillagesCrawlerService) { }

  /**
  * Gets a simple overview of villages with their names and URLs after login
  * This endpoint verifies bot functionality and shows basic village information
  */
  // @Get('villages-overview')
  // @ApiOperation({
  //   summary: 'Get villages overview with login verification',
  //   description: 'Logs into the account and returns a simple list of villages with their names and URLs. This verifies that the bot can successfully access the account and retrieve village information.'
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Login successful and village overview retrieved',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean' },
  //       message: { type: 'string' },
  //       timestamp: { type: 'string', format: 'date-time' },
  //       processingTime: { type: 'number', description: 'Time taken in milliseconds' },
  //       villagesCount: { type: 'number', description: 'Total number of villages found' },
  //       villages: {
  //         type: 'array',
  //         items: {
  //           type: 'object',
  //           properties: {
  //             id: { type: 'string', description: 'Village ID' },
  //             name: { type: 'string', description: 'Village name' },
  //             coordinates: { type: 'string', description: 'Village coordinates' },
  //             url: { type: 'string', description: 'Direct URL to village overview' },
  //             scavengingUrl: { type: 'string', description: 'Direct URL to village scavenging page' }
  //           }
  //         }
  //       }
  //     }
  //   }
  // })
  // @ApiResponse({ status: 500, description: 'Login or village retrieval failed' })
  // public async getVillagesOverview() {
  //   const startTime = Date.now();

  //   try {
  //     this.logger.log('Getting villages overview with login verification');

  //     // Call service method to get villages overview
  //     const result = await this.villagesCrawlerService.getVillagesOverview({ headless: true });

  //     const processingTime = Date.now() - startTime;

  //     if (result.success) {
  //       this.logger.log(`Villages overview retrieved successfully in ${processingTime}ms`);

  //       return {
  //         success: true,
  //         message: result.message,
  //         timestamp: new Date().toISOString(),
  //         processingTime,
  //         villagesCount: result.villages?.length || 0,
  //         villages: result.villages || []
  //       };
  //     } else {
  //       this.logger.warn(`Villages overview failed: ${result.message}`);

  //       throw new InternalServerErrorException({
  //         success: false,
  //         message: result.message || 'Failed to get villages overview',
  //         timestamp: new Date().toISOString(),
  //         processingTime,
  //         villagesCount: 0,
  //         villages: []
  //       });
  //     }

  //   } catch (error) {
  //     const processingTime = Date.now() - startTime;

  //     this.logger.error(`Error during villages overview: ${error.message}`, error.stack);

  //     if (error instanceof HttpException) {
  //       throw error;
  //     }

  //     throw new InternalServerErrorException({
  //       success: false,
  //       message: 'Failed to get villages overview',
  //       error: error.message,
  //       timestamp: new Date().toISOString(),
  //       processingTime,
  //       villagesCount: 0,
  //       villages: []
  //     });
  //   }
  // }


  /**
   * Gets basic village information (fast endpoint)
   * Returns only overview data: ID, name, coordinates, points, resources, storage
   */
  // @Get('villages-basic')
  // @ApiOperation({
  //   summary: 'Get basic village information',
  //   description: 'Quickly retrieves basic information about all villages (name, coordinates, points, resources). Does not include building levels, army units, or queues.'
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Basic village information retrieved successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean' },
  //       count: { type: 'number' },
  //       villages: {
  //         type: 'array',
  //         items: {
  //           type: 'object',
  //           properties: {
  //             id: { type: 'string' },
  //             name: { type: 'string' },
  //             coordinates: { type: 'string' },
  //             points: { type: 'number' },
  //             resources: {
  //               type: 'object',
  //               properties: {
  //                 wood: { type: 'number' },
  //                 clay: { type: 'number' },
  //                 iron: { type: 'number' }
  //               }
  //             },
  //             storage: { type: 'number' },
  //               type: 'object',
  //               properties: {
  //                 current: { type: 'number' },
  //                 max: { type: 'number' }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       processingTime: { type: 'number', description: 'Time taken in milliseconds' }
  //     }
  //   }
  // })
  // @ApiResponse({ status: 500, description: 'Failed to retrieve village information' })
  // public async getOverviewVillageInformation() {
  //   const startTime = Date.now();

  //   try {
  //     this.logger.log('Requested basic village information');

  //     const villages = await this.villagesCrawlerService.getOverviewVillageInformation({
  //       headless: true,
  //       timeoutPerPage: 15000
  //     });

  //     const processingTime = Date.now() - startTime;

  //     if (villages.length > 0) {
  //       this.logger.log(`Successfully retrieved basic information for ${villages.length} villages in ${processingTime}ms`);

  //       return {
  //         success: true,
  //         processingTime,
  //         timestamp: new Date().toISOString(),
  //         count: villages.length,
  //         villages: villages,
  //       };
  //     } else {
  //       this.logger.warn('No villages found or data collection failed');

  //       return {
  //         success: false,
  //         processingTime,
  //         count: 0,
  //         villages: [],
  //         message: 'No villages found or data collection failed'
  //       };
  //     }

  //   } catch (error) {
  //     const processingTime = Date.now() - startTime;

  //     this.logger.error(`Error retrieving basic village information: ${error.message}`, error.stack);

  //     throw new InternalServerErrorException({
  //       success: false,
  //       message: 'Failed to retrieve basic village information',
  //       error: error.message,
  //       processingTime
  //     });
  //   }
  // }
  // @Post()
  // create(@Body() createVillagesCrawlerDto: CreateVillagesCrawlerDto) {
  //   return this.villagesCrawlerService.create(createVillagesCrawlerDto);
  // }

  // @Get()
  // findAll() {
  //   return this.villagesCrawlerService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.villagesCrawlerService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateVillagesCrawlerDto: UpdateVillagesCrawlerDto) {
  //   return this.villagesCrawlerService.update(+id, updateVillagesCrawlerDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.villagesCrawlerService.remove(+id);
  // }
}
