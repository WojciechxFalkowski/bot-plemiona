import { Controller, Post, Get, Logger, InternalServerErrorException, Param, ParseIntPipe } from '@nestjs/common';
import { CrawlerOrchestratorService } from './crawler-orchestrator.service';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';

@ApiTags('Crawler Orchestrator')
@Controller('crawler-orchestrator')
export class CrawlerOrchestratorController {
    private readonly logger = new Logger(CrawlerOrchestratorController.name);

    constructor(private readonly orchestratorService: CrawlerOrchestratorService) { }

    @Post(':serverId/trigger-scavenging')
    @ApiOperation({
        summary: 'Manually trigger scavenging process for a server',
        description: 'Manually starts the scavenging process for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Scavenging process triggered successfully'
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error during scavenging process'
    })
    async triggerScavenging(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Manual scavenging trigger requested for server ${serverId}`);

        try {
            await this.orchestratorService.triggerScavenging(serverId);
            return {
                success: true,
                message: `Scavenging process completed successfully for server ${serverId}`
            };
        } catch (error) {
            this.logger.error(`Error during manual scavenging trigger for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Scavenging process failed: ${error.message}`);
        }
    }

    @Post(':serverId/trigger-construction-queue')
    @ApiOperation({
        summary: 'Manually trigger construction queue processing for a server',
        description: 'Manually starts the construction queue processing for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Construction queue processing triggered successfully'
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error during construction queue processing'
    })
    async triggerConstructionQueue(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Manual construction queue trigger requested for server ${serverId}`);

        try {
            await this.orchestratorService.triggerConstructionQueue(serverId);
            return {
                success: true,
                message: `Construction queue processing completed successfully for server ${serverId}`
            };
        } catch (error) {
            this.logger.error(`Error during manual construction queue trigger for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Construction queue processing failed: ${error.message}`);
        }
    }

    @Post(':serverId/trigger-mini-attacks')
    @ApiOperation({
        summary: 'Manually trigger mini attacks for a server',
        description: 'Manually starts the mini attacks process for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Mini attacks triggered successfully'
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error during mini attacks'
    })
    async triggerMiniAttacks(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Manual mini attacks trigger requested for server ${serverId}`);

        try {
            await this.orchestratorService.triggerMiniAttacks(serverId);
            return {
                success: true,
                message: `Mini attacks completed successfully for server ${serverId}`
            };
        } catch (error) {
            this.logger.error(`Error during manual mini attacks trigger for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Mini attacks failed: ${error.message}`);
        }
    }

    @Post('start-monitoring')
    @ApiOperation({
        summary: 'Manually start orchestrator monitoring',
        description: `Manually triggers the orchestrator monitoring check. This is useful when:
        
        • The application starts with no servers having CRAWLER_ORCHESTRATOR_ENABLED=true
        • Later, you enable the orchestrator for a server using settings API
        • You need to force the orchestrator to detect the change immediately
        
        **Typical workflow:**
        1. Application starts with orchestrator disabled
        2. Enable orchestrator: \`POST /api/settings/{serverId}/CRAWLER_ORCHESTRATOR_ENABLED\` with \`{"value": true}\`
        3. Call this endpoint to force monitoring check
        4. Orchestrator will start if any server has it enabled
        
        **Note:** The monitoring runs automatically every 3 minutes, but this endpoint allows immediate response to setting changes.`
    })
    @ApiResponse({
        status: 200,
        description: 'Monitoring check completed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Monitoring check completed successfully' },
                orchestratorStatus: {
                    type: 'string',
                    example: 'started',
                    description: 'Current orchestrator status after the check'
                }
            }
        }
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error during monitoring check'
    })
    async startMonitoring() {
        this.logger.log('Manual monitoring start requested');

        try {
            await this.orchestratorService.startMonitoringManually();

            // Get current status to show if orchestrator is now active
            const status = this.orchestratorService.getMultiServerStatus();
            const orchestratorStatus = status.schedulerActive ? 'started' : 'stopped';

            return {
                success: true,
                message: 'Monitoring check completed successfully',
                orchestratorStatus,
                activeServersCount: status.activeServersCount,
                schedulerActive: status.schedulerActive
            };
        } catch (error) {
            this.logger.error('Error during manual monitoring start:', error);
            throw new InternalServerErrorException(`Monitoring check failed: ${error.message}`);
        }
    }

    @Get('status')
    @ApiOperation({
        summary: 'Get multi-server orchestrator status',
        description: 'Returns the current status of all servers in the multi-server orchestrator'
    })
    @ApiResponse({
        status: 200,
        description: 'Multi-server orchestrator status retrieved successfully'
    })
    getStatus() {
        this.logger.log('Multi-server orchestrator status requested');

        try {
            const status = this.orchestratorService.getMultiServerStatus();
            return {
                success: true,
                data: status
            };
        } catch (error) {
            this.logger.error('Error getting multi-server status:', error);
            throw new InternalServerErrorException(`Failed to get status: ${error.message}`);
        }
    }
} 