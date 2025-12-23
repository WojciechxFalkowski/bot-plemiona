import { Controller, Post, Get, Logger, InternalServerErrorException, Param, ParseIntPipe, Body } from '@nestjs/common';
import { CrawlerOrchestratorService } from './crawler-orchestrator.service';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import {
    TriggerScavengingDecorator,
    TriggerConstructionQueueDecorator,
    TriggerMiniAttacksDecorator,
    TriggerArmyTrainingDecorator,
    StartMonitoringDecorator,
    UpdateConstructionQueueSettingDecorator,
    UpdateMiniAttacksSettingDecorator,
    UpdateScavengingSettingDecorator,
    UpdateArmyTrainingSettingDecorator,
    GetStatusDecorator
} from './decorators';

@ApiTags('Crawler Orchestrator')
@Controller('crawler-orchestrator')
export class CrawlerOrchestratorController {
    private readonly logger = new Logger(CrawlerOrchestratorController.name);

    constructor(
        private readonly orchestratorService: CrawlerOrchestratorService,
        private readonly settingsService: SettingsService
    ) { }

    @Post(':serverId/trigger-scavenging')
    @TriggerScavengingDecorator()
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
    @TriggerConstructionQueueDecorator()
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
    @TriggerMiniAttacksDecorator()
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

    @Post(':serverId/trigger-army-training')
    @TriggerArmyTrainingDecorator()
    async triggerArmyTraining(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Manual army training trigger requested for server ${serverId}`);

        try {
            await this.orchestratorService.triggerArmyTraining(serverId);
            return {
                success: true,
                message: `Army training completed successfully for server ${serverId}`
            };
        } catch (error) {
            this.logger.error(`Error during manual army training trigger for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Army training failed: ${error.message}`);
        }
    }

    @Post('start-monitoring')
    @StartMonitoringDecorator()
    async startMonitoring() {
        this.logger.log('Manual monitoring start requested');

        try {
            await this.orchestratorService.startMonitoringManually();

            // Get current status to show if orchestrator is now active
            const status = await this.orchestratorService.getMultiServerStatus();
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

    @Post('settings/:serverId/construction-queue')
    @UpdateConstructionQueueSettingDecorator()
    async updateConstructionQueueSetting(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() dto: { value: boolean }
    ) {
        this.logger.log(`Updating construction queue setting for server ${serverId}: value=${dto.value}`);

        try {
            // 1. Update setting
            await this.settingsService.setSetting(serverId, SettingsKey.AUTO_CONSTRUCTION_QUEUE_ENABLED, { value: dto.value });

            // 2. Refresh task states immediately
            await this.orchestratorService.updateServerTaskStates(serverId);

            return {
                success: true,
                message: `Construction queue setting updated to ${dto.value} for server ${serverId}`,
                setting: {
                    serverId,
                    key: SettingsKey.AUTO_CONSTRUCTION_QUEUE_ENABLED,
                    value: dto.value
                }
            };
        } catch (error) {
            this.logger.error(`Error updating construction queue setting for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Failed to update construction queue setting: ${error.message}`);
        }
    }

    @Post('settings/:serverId/mini-attacks')
    @UpdateMiniAttacksSettingDecorator()
    async updateMiniAttacksSetting(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() dto: { value: boolean }
    ) {
        this.logger.log(`Updating mini attacks setting for server ${serverId}: value=${dto.value}`);

        try {
            // 1. Update setting
            await this.settingsService.setSetting(serverId, SettingsKey.MINI_ATTACKS_ENABLED, { value: dto.value });

            // 2. Refresh task states immediately
            await this.orchestratorService.updateServerTaskStates(serverId);

            return {
                success: true,
                message: `Mini attacks setting updated to ${dto.value} for server ${serverId}`,
                setting: {
                    serverId,
                    key: SettingsKey.MINI_ATTACKS_ENABLED,
                    value: dto.value
                }
            };
        } catch (error) {
            this.logger.error(`Error updating mini attacks setting for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Failed to update mini attacks setting: ${error.message}`);
        }
    }

    @Post('settings/:serverId/scavenging')
    @UpdateScavengingSettingDecorator()
    async updateScavengingSetting(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() dto: { value: boolean }
    ) {
        this.logger.log(`Updating scavenging setting for server ${serverId}: value=${dto.value}`);

        try {
            // 1. Update setting
            await this.settingsService.setSetting(serverId, SettingsKey.AUTO_SCAVENGING_ENABLED, { value: dto.value });

            // 2. Refresh task states immediately
            await this.orchestratorService.updateServerTaskStates(serverId);

            return {
                success: true,
                message: `Scavenging setting updated to ${dto.value} for server ${serverId}`,
                setting: {
                    serverId,
                    key: SettingsKey.AUTO_SCAVENGING_ENABLED,
                    value: dto.value
                }
            };
        } catch (error) {
            this.logger.error(`Error updating scavenging setting for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Failed to update scavenging setting: ${error.message}`);
        }
    }

    @Post('settings/:serverId/army-training')
    @UpdateArmyTrainingSettingDecorator()
    async updateArmyTrainingSetting(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() dto: { value: boolean }
    ) {
        this.logger.log(`Updating army training setting for server ${serverId}: value=${dto.value}`);

        try {
            // 1. Update setting
            await this.settingsService.setSetting(serverId, SettingsKey.AUTO_ARMY_TRAINING_LIGHT_ENABLED, { value: dto.value });

            // 2. Refresh task states immediately
            await this.orchestratorService.updateServerTaskStates(serverId);

            return {
                success: true,
                message: `Army training setting updated to ${dto.value} for server ${serverId}`,
                setting: {
                    serverId,
                    key: SettingsKey.AUTO_ARMY_TRAINING_LIGHT_ENABLED,
                    value: dto.value
                }
            };
        } catch (error) {
            this.logger.error(`Error updating army training setting for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Failed to update army training setting: ${error.message}`);
        }
    }

    @Get('status')
    @GetStatusDecorator()
    async getStatus() {
        this.logger.log('Multi-server orchestrator status requested');

        try {
            const status = await this.orchestratorService.getMultiServerStatus();
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