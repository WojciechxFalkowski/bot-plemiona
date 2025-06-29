import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get, Param, Delete, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VillageConstructionQueueService } from './village-construction-queue.service';
import { CreateConstructionQueueDto } from './dto/create-construction-queue.dto';
import { CreateConstructionQueueApiDto } from './dto/create-construction-queue-api.dto';
import { VillageConstructionQueueEntity } from './entities/village-construction-queue.entity';
import { BuildingLevels, BuildQueueItem } from '@/crawler/pages/village-overview.page';
import { VillageResponseDto } from '@/villages/dto';
import { VillagesService } from '@/villages/villages.service';
import { 
    AddBuildingToQueueDecorators,
    GetVillageQueueDecorators,
    GetAllVillagesQueueDecorators,
    RemoveFromQueueDecorators,
    ScrapeAllVillagesQueueDecorators,
    ScrapeVillageQueueDecorators
} from './decorators';

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
    @AddBuildingToQueueDecorators()
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

    @Get('village/:villageName')
    @HttpCode(HttpStatus.OK)
    @GetVillageQueueDecorators()
    async getVillageQueue(
        @Param('villageName') villageName: string
    ): Promise<VillageConstructionQueueEntity[]> {
        this.logger.log(`Request to get construction queue for village "${villageName}"`);

        try {
            // Find village by name to get its ID
            const village = await this.villagesService.findByName(villageName);

            if (!village) {
                this.logger.error(`Village not found: "${villageName}"`);
                throw new NotFoundException(`Village with name "${villageName}" not found`);
            }

            const result = await this.constructionQueueService.getQueueForVillage(village.id);
            this.logger.log(`Successfully retrieved ${result.length} queue items for village "${villageName}" (ID: ${village.id})`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to get queue for village "${villageName}": ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get('all')
    @HttpCode(HttpStatus.OK)
    @GetAllVillagesQueueDecorators()
    async getAllVillagesQueue(): Promise<VillageConstructionQueueEntity[]> {
        this.logger.log('Request to get construction queue for all villages');

        try {
            const result = await this.constructionQueueService.getAllQueues();
            this.logger.log(`Successfully retrieved ${result.length} total queue items for all villages`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to get queue for all villages: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @RemoveFromQueueDecorators()
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

    @Get('scrape-village-queue/:villageName')
    @HttpCode(HttpStatus.OK)
    @ScrapeVillageQueueDecorators()
    async scrapeVillageQueue(
        @Param('villageName') villageName: string
    ): Promise<{
        villageInfo: VillageResponseDto;
        buildingLevels: BuildingLevels;
        buildQueue: BuildQueueItem[];
    }> {
        this.logger.log(`Request to scrape queue for village "${villageName}"`);

        try {
            const result = await this.constructionQueueService.scrapeVillageQueue(villageName);
            this.logger.log(`Successfully scraped queue for village "${villageName}"`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to scrape queue for village "${villageName}": ${error.message}`, error.stack);
            throw error;
        }
    }

    //Scrape all villages game queue
    @Get('scrape-all-villages-queue')
    @HttpCode(HttpStatus.OK)
    @ScrapeAllVillagesQueueDecorators()
    async scrapeAllVillagesQueue(): Promise<{
        villageInfo: VillageResponseDto;
        buildingLevels: BuildingLevels;
        buildQueue: BuildQueueItem[];
    }[]> {
        return await this.constructionQueueService.scrapeAllVillagesQueue();
    }
}