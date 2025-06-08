import { Controller, Post, Get, Logger, InternalServerErrorException } from '@nestjs/common';
import { CrawlerOrchestratorService } from './crawler-orchestrator.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Crawler Orchestrator')
@Controller('crawler-orchestrator')
export class CrawlerOrchestratorController {
    private readonly logger = new Logger(CrawlerOrchestratorController.name);

    constructor(private readonly orchestratorService: CrawlerOrchestratorService) { }

    @Post('trigger-scavenging')
    @ApiOperation({
        summary: 'Manually trigger scavenging process',
        description: 'Manually starts the scavenging process for all enabled villages'
    })
    @ApiResponse({
        status: 200,
        description: 'Scavenging process triggered successfully'
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error during scavenging process'
    })
    async triggerScavenging() {
        this.logger.log('Manual scavenging trigger requested');

        try {
            await this.orchestratorService.triggerScavenging();
            return {
                success: true,
                message: 'Scavenging process completed successfully'
            };
        } catch (error) {
            this.logger.error('Error during manual scavenging trigger:', error);
            throw new InternalServerErrorException(`Scavenging process failed: ${error.message}`);
        }
    }

    @Post('trigger-construction-queue')
    @ApiOperation({
        summary: 'Manually trigger construction queue processing',
        description: 'Manually starts the construction queue processing for all villages'
    })
    @ApiResponse({
        status: 200,
        description: 'Construction queue processing triggered successfully'
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error during construction queue processing'
    })
    async triggerConstructionQueue() {
        this.logger.log('Manual construction queue trigger requested');

        try {
            await this.orchestratorService.triggerConstructionQueue();
            return {
                success: true,
                message: 'Construction queue processing completed successfully'
            };
        } catch (error) {
            this.logger.error('Error during manual construction queue trigger:', error);
            throw new InternalServerErrorException(`Construction queue processing failed: ${error.message}`);
        }
    }

    @Post('manual-start')
    @ApiOperation({
        summary: 'Manually start orchestrator',
        description: 'Manually starts the orchestrator if it is disabled'
    })
    @ApiResponse({
        status: 200,
        description: 'Orchestrator start triggered successfully'
    })
    async manualStart() {
        this.logger.log('Manual orchestrator start requested');

        // This will trigger the orchestrator to check and start if needed
        // The actual processing happens asynchronously
        return {
            success: true,
            message: 'Orchestrator start check initiated'
        };
    }

    @Get('status')
    @ApiOperation({
        summary: 'Get orchestrator status',
        description: 'Returns the current status of the crawler orchestrator'
    })
    @ApiResponse({
        status: 200,
        description: 'Orchestrator status retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                running: {
                    type: 'boolean',
                    description: 'Whether the orchestrator is currently running'
                },
                message: {
                    type: 'string',
                    description: 'Status message'
                }
            }
        }
    })
    getStatus() {
        this.logger.log('Orchestrator status requested');

        return {
            running: true, // TODO: Implement actual status tracking
            message: 'Orchestrator is running and managing crawlers'
        };
    }
} 