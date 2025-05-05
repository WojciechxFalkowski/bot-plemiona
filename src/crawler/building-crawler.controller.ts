import { Controller, Get, Post, Body, Delete, Param, HttpException, HttpStatus } from '@nestjs/common';
import { BuildingCrawlerService } from './building-crawler.service';
import { BuildingQueueItem } from '../models/tribal-wars/building-queue-manager';
import { ApiOperation, ApiResponse as SwaggerApiResponse, ApiTags, ApiBody, ApiParam } from '@nestjs/swagger';
import { IsString, IsNumber, IsInt, Min, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for building operations
 */
export class BuildingDto {
    /**
     * ID of the building (e.g. 'barracks', 'farm', 'wall')
     * @example 'barracks'
     */
    @IsString()
    @IsNotEmpty()
    buildingId: string;

    /**
     * Target level to upgrade the building to
     * @example 3
     */
    @IsInt()
    @Min(1)
    level: number;

    /**
     * Priority in the building queue (lower number = higher priority)
     * @example 1
     */
    @IsInt()
    @Min(1)
    priority: number;
}

/**
 * Response structure for API operations
 */
class SuccessResponse {
    /**
     * Whether the operation was successful
     * @example true
     */
    success: boolean;

    /**
     * Message describing the result
     * @example "Building crawler started successfully"
     */
    message: string;
}

@ApiTags('Building Crawler')
@Controller('building-crawler')
export class BuildingCrawlerController {
    constructor(private readonly buildingCrawlerService: BuildingCrawlerService) { }

    /**
     * Start the building crawler
     */
    @Post('start')
    @ApiOperation({ summary: 'Start the building crawler' })
    @SwaggerApiResponse({
        status: 200,
        description: 'Crawler started successfully',
        type: SuccessResponse
    })
    async startCrawler() {
        try {
            await this.buildingCrawlerService.start();

            return { success: true, message: 'Building crawler started successfully' };
        } catch (error) {
            throw new HttpException(
                `Failed to start building crawler: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Stop the building crawler
     */
    @Post('stop')
    @ApiOperation({ summary: 'Stop the building crawler' })
    @SwaggerApiResponse({
        status: 200,
        description: 'Crawler stopped successfully',
        type: SuccessResponse
    })
    async stopCrawler() {
        try {
            await this.buildingCrawlerService.stop();
            return { success: true, message: 'Building crawler stopped successfully' };
        } catch (error) {
            throw new HttpException(
                `Failed to stop building crawler: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Get the current status of the building crawler
     */
    @Get('status')
    @ApiOperation({ summary: 'Get the crawler status' })
    @SwaggerApiResponse({
        status: 200,
        description: 'Current crawler status'
    })
    getCrawlerStatus() {
        const isActive = this.buildingCrawlerService.isActive();
        return {
            active: isActive,
            message: isActive ? 'Building crawler is running' : 'Building crawler is not running'
        };
    }

    /**
     * Get the current building queue
     */
    @Get('queue')
    @ApiOperation({ summary: 'Get the current building queue' })
    @SwaggerApiResponse({
        status: 200,
        description: 'Current building queue'
    })
    getBuildingQueue() {
        return {
            queue: this.buildingCrawlerService.getQueue()
        };
    }

    /**
     * Set the complete building queue (replaces existing queue)
     */
    @Post('queue')
    @ApiOperation({ summary: 'Set the complete building queue' })
    @ApiBody({
        type: [BuildingDto],
        description: 'Array of buildings to add to the queue'
    })
    @SwaggerApiResponse({
        status: 200,
        description: 'Queue updated successfully',
        type: SuccessResponse
    })
    setBuildingQueue(@Body() queue: BuildingQueueItem[]) {
        try {
            this.buildingCrawlerService.setQueue(queue);
            return { success: true, message: 'Building queue updated successfully' };
        } catch (error) {
            throw new HttpException(
                `Failed to update building queue: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Add a building to the construction queue
     */
    @Post('queue/add')
    @ApiOperation({ summary: 'Add a building to the queue' })
    @ApiBody({
        type: BuildingDto,
        description: 'Building to add to the queue'
    })
    @SwaggerApiResponse({
        status: 200,
        description: 'Building added to queue',
        type: SuccessResponse
    })
    addBuildingToQueue(@Body() buildingDto: BuildingDto) {
        try {
            const { buildingId, level, priority } = buildingDto;

            if (!buildingId || !level || priority === undefined) {
                throw new HttpException(
                    'buildingId, level, and priority are required',
                    HttpStatus.BAD_REQUEST
                );
            }

            this.buildingCrawlerService.addToQueue(buildingId, level, priority);
            return { success: true, message: `Building ${buildingId} (level ${level}) added to queue` };
        } catch (error) {
            throw new HttpException(
                `Failed to add building to queue: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Remove a building from the queue
     * @param buildingId - ID of the building to remove
     * @param level - Target level of the building to remove
     */
    @Delete('queue/:buildingId/:level')
    @ApiOperation({ summary: 'Remove a building from the queue' })
    @ApiParam({ name: 'buildingId', description: 'ID of the building to remove' })
    @ApiParam({ name: 'level', description: 'Target level of the building to remove' })
    @SwaggerApiResponse({
        status: 200,
        description: 'Building removed from queue',
        type: SuccessResponse
    })
    removeBuildingFromQueue(@Param('buildingId') buildingId: string, @Param('level') level: string) {
        try {
            const levelNum = parseInt(level, 10);

            if (isNaN(levelNum)) {
                throw new HttpException('Level must be a number', HttpStatus.BAD_REQUEST);
            }

            this.buildingCrawlerService.removeFromQueue(buildingId, levelNum);
            return { success: true, message: `Building ${buildingId} (level ${level}) removed from queue` };
        } catch (error) {
            throw new HttpException(
                `Failed to remove building from queue: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
} 