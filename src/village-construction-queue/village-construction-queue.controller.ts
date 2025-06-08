import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get, Param, Delete, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VillageConstructionQueueService } from './village-construction-queue.service';
import { CreateConstructionQueueDto } from './dto/create-construction-queue.dto';
import { CreateConstructionQueueApiDto } from './dto/create-construction-queue-api.dto';
import { VillageConstructionQueueEntity } from './entities/village-construction-queue.entity';
import { ApiResponsesAddToQueue } from './api-responses';
import { ApiExamplesAddToQueue } from './api-examples';
import { BuildingLevels, BuildQueueItem } from '@/crawler/pages/village-overview.page';
import { VillageResponseDto } from '@/villages/dto';
import { VillagesService } from '@/villages/villages.service';

@ApiTags('Village Construction Queue')
@Controller('village-construction-queue')
export class VillageConstructionQueueController {
    private readonly logger = new Logger(VillageConstructionQueueController.name);

    constructor(
        private readonly constructionQueueService: VillageConstructionQueueService,
        private readonly villagesService: VillagesService
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Add building to construction queue',
        description: 'Adds a building to the construction queue for a specific village. The building will be validated for requirements and level constraints including game data scraping.'
    })
    @ApiBody({
        type: CreateConstructionQueueApiDto,
        description: 'Building details to add to queue',
        examples: ApiExamplesAddToQueue
    })
    @ApiResponsesAddToQueue()
    async addBuildingToQueue(
        @Body() createDto: CreateConstructionQueueApiDto
    ): Promise<VillageConstructionQueueEntity> {
        this.logger.log(`Request to add building ${createDto.buildingId} level ${createDto.targetLevel} to queue for village "${createDto.villageName}"`);

        try {
            // Find village by name to get its ID
            const village = await this.villagesService.findByName(createDto.villageName);

            if (!village) {
                this.logger.error(`Village not found: "${createDto.villageName}"`);
                throw new NotFoundException(`Village with name "${createDto.villageName}" not found`);
            }

            // Create internal DTO with village ID for service
            const serviceDto: CreateConstructionQueueDto = {
                villageId: village.id,
                buildingId: createDto.buildingId,
                targetLevel: createDto.targetLevel
            };

            const result = await this.constructionQueueService.addToQueue(serviceDto);
            this.logger.log(`Successfully processed request for building ${createDto.buildingId} level ${createDto.targetLevel} in village "${createDto.villageName}" (ID: ${village.id})`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to add building to queue: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get('village/:villageId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get construction queue for village',
        description: 'Retrieves all buildings in the construction queue for a specific village, ordered by creation time (FIFO).'
    })
    @ApiParam({
        name: 'villageId',
        description: 'Village ID to get queue for',
        example: '12345'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successfully retrieved construction queue',
        type: [VillageConstructionQueueEntity]
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Village not found'
    })
    async getVillageQueue(
        @Param('villageId') villageId: string
    ): Promise<VillageConstructionQueueEntity[]> {
        this.logger.log(`Request to get construction queue for village ${villageId}`);

        try {
            const result = await this.constructionQueueService.getQueueForVillage(villageId);
            this.logger.log(`Successfully retrieved ${result.length} queue items for village ${villageId}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to get queue for village ${villageId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Remove building from construction queue',
        description: 'Removes a specific building from the construction queue by its ID.'
    })
    @ApiParam({
        name: 'id',
        description: 'Queue item ID to remove',
        example: 1
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successfully removed from queue',
        type: VillageConstructionQueueEntity
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Queue item not found'
    })
    async removeFromQueue(
        @Param('id', ParseIntPipe) id: number
    ): Promise<VillageConstructionQueueEntity> {
        this.logger.log(`Request to remove queue item ${id}`);

        try {
            const result = await this.constructionQueueService.removeFromQueue(id);
            this.logger.log(`Successfully removed queue item ${id}: ${result.buildingName} level ${result.targetLevel}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to remove queue item ${id}: ${error.message}`, error.stack);
            throw error;
        }
    }

    //Scrape all villages game queue
    @Get('scrape-all-villages-queue')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Scrape all villages game queue',
        description: 'Scrapes all villages game queue'
    })
    async scrapeAllVillagesQueue(): Promise<{
        villageInfo: VillageResponseDto;
        buildingLevels: BuildingLevels;
        buildQueue: BuildQueueItem[];
    }[]> {
        return await this.constructionQueueService.scrapeAllVillagesQueue();
    }
}