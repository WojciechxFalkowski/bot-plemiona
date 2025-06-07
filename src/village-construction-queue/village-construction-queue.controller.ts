import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VillageConstructionQueueService } from './village-construction-queue.service';
import { CreateConstructionQueueDto } from './dto/create-construction-queue.dto';
import { VillageConstructionQueueEntity } from './entities/village-construction-queue.entity';
import { ApiResponsesAddToQueue } from './api-responses';
import { ApiExamplesAddToQueue } from './api-examples';

@ApiTags('Village Construction Queue')
@Controller('village-construction-queue')
export class VillageConstructionQueueController {
    private readonly logger = new Logger(VillageConstructionQueueController.name);

    constructor(
        private readonly constructionQueueService: VillageConstructionQueueService
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Add building to construction queue',
        description: 'Adds a building to the construction queue for a specific village. The building will be validated for requirements and level constraints including game data scraping.'
    })
    @ApiBody({
        type: CreateConstructionQueueDto,
        description: 'Building details to add to queue',
        examples: ApiExamplesAddToQueue
    })
    @ApiResponsesAddToQueue()
    async addBuildingToQueue(
        @Body() createDto: CreateConstructionQueueDto
    ): Promise<VillageConstructionQueueEntity> {
        this.logger.log(`Request to add building ${createDto.buildingId} level ${createDto.targetLevel} to queue for village ${createDto.villageId}`);

        try {
            const result = await this.constructionQueueService.addToQueue(createDto);
            this.logger.log(`Successfully processed request for building ${createDto.buildingId} level ${createDto.targetLevel}`);
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
} 