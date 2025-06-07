import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
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
        description: 'Adds a building to the construction queue for a specific village. The building will be validated for requirements and level constraints.'
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
} 