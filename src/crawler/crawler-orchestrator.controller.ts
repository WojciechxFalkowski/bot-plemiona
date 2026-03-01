import { Controller, Post, Get, Logger, InternalServerErrorException, Param, ParseIntPipe, Body } from '@nestjs/common';
import { CrawlerOrchestratorService } from './crawler-orchestrator.service';
import { CrawlerStatusService } from './crawler-status.service';
import { ServersService } from '@/servers/servers.service';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import {
    TriggerScavengingDecorator,
    TriggerConstructionQueueDecorator,
    TriggerMiniAttacksDecorator,
    TriggerArmyTrainingDecorator,
    TriggerTwDatabaseDecorator,
    StartMonitoringDecorator,
    UpdateConstructionQueueSettingDecorator,
    UpdateMiniAttacksSettingDecorator,
    UpdateScavengingSettingDecorator,
    UpdateArmyTrainingSettingDecorator,
    UpdateTwDatabaseSettingDecorator,
    GetTwDatabaseSettingDecorator,
    GetStatusDecorator,
    GetCrawlerStatusDecorator,
    GetDefaultIntervalsDecorator
} from './decorators';
import { EncryptionService } from '@/utils/encryption/encryption.service';

@ApiTags('Crawler Orchestrator')
@Controller('crawler-orchestrator')
export class CrawlerOrchestratorController {
    private readonly logger = new Logger(CrawlerOrchestratorController.name);

    constructor(
        private readonly orchestratorService: CrawlerOrchestratorService,
        private readonly settingsService: SettingsService,
        private readonly encryptionService: EncryptionService,
        private readonly crawlerStatusService: CrawlerStatusService,
        private readonly serversService: ServersService
    ) { }

    @Post(':serverId/trigger-scavenging')
    @TriggerScavengingDecorator()
    async triggerScavenging(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Manual scavenging trigger requested for server ${serverId}`);

        try {
            const result = await this.orchestratorService.triggerScavenging(serverId);

            if (!result.autoScavengingEnabled) {
                return {
                    success: true,
                    message: `Auto-zbieractwo jest wyłączone dla serwera ${result.serverCode} (${result.serverName}). Bot nie został uruchomiony.`
                };
            }

            return {
                success: true,
                message: `Zbieractwo zostało pomyślnie uruchomione dla serwera ${result.serverCode} (${result.serverName})`
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

    @Post(':serverId/trigger-tw-database')
    @TriggerTwDatabaseDecorator()
    async triggerTwDatabase(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Manual TW Database trigger requested for server ${serverId}`);

        try {
            await this.orchestratorService.triggerTwDatabase(serverId);
            return {
                success: true,
                message: `TW Database completed successfully for server ${serverId}`
            };
        } catch (error) {
            this.logger.error(`Error during manual TW Database trigger for server ${serverId}:`, error);
            throw new InternalServerErrorException(`TW Database failed: ${error.message}`);
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

    @Get('settings/:serverId/tw-database')
    @GetTwDatabaseSettingDecorator()
    async getTwDatabaseSetting(@Param('serverId', ParseIntPipe) serverId: number) {
        this.logger.log(`Getting TW Database setting for server ${serverId}`);

        try {
            const setting = await this.settingsService.getSetting<{
                enabled?: boolean;
                login?: string;
                passwordEncrypted?: string;
            }>(serverId, SettingsKey.TW_DATABASE);

            let password = '';
            if (setting?.passwordEncrypted && this.encryptionService.isAvailable()) {
                try {
                    password = this.encryptionService.decrypt(setting.passwordEncrypted);
                } catch {
                    this.logger.warn(`Could not decrypt TW Database password for server ${serverId}`);
                }
            }

            return {
                success: true,
                enabled: setting?.enabled ?? false,
                login: setting?.login ?? '',
                password
            };
        } catch (error) {
            this.logger.error(`Error getting TW Database setting for server ${serverId}:`, error);
            throw new InternalServerErrorException(`Failed to get TW Database setting: ${error.message}`);
        }
    }

    @Post('settings/:serverId/tw-database')
    @UpdateTwDatabaseSettingDecorator()
    async updateTwDatabaseSetting(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() dto: { value?: boolean; login?: string; password?: string }
    ) {
        this.logger.log(`Updating TW Database setting for server ${serverId}`);

        try {
            const existing = await this.settingsService.getSetting<{
                enabled?: boolean;
                login?: string;
                passwordEncrypted?: string;
            }>(serverId, SettingsKey.TW_DATABASE);

            const enabled = dto.value !== undefined ? dto.value : (existing?.enabled ?? false);
            const login = dto.login !== undefined ? dto.login : (existing?.login ?? '');
            let passwordEncrypted = existing?.passwordEncrypted ?? '';

            if (dto.password !== undefined && dto.password !== '') {
                if (!this.encryptionService.isAvailable()) {
                    throw new InternalServerErrorException('ENCRYPTION_KEY is not configured - cannot store password');
                }
                passwordEncrypted = this.encryptionService.encrypt(dto.password);
            }

            await this.settingsService.setSetting(serverId, SettingsKey.TW_DATABASE, {
                enabled,
                login,
                passwordEncrypted
            });

            await this.orchestratorService.updateServerTaskStates(serverId);

            return {
                success: true,
                message: `TW Database setting updated for server ${serverId}`,
                setting: { serverId, enabled, login }
            };
        } catch (error) {
            this.logger.error(`Error updating TW Database setting for server ${serverId}:`, error);
            throw new InternalServerErrorException(
                `Failed to update TW Database setting: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    @Get('crawler-status')
    @GetCrawlerStatusDecorator()
    async getCrawlerStatus() {
        try {
            const { activeServer, recaptchaBlockedServerIds, nextScheduledInSeconds, nextScheduledTask } = this.crawlerStatusService.getStatus();

            const recaptchaBlocked = await Promise.all(
                recaptchaBlockedServerIds.map(async (serverId) => {
                    const server = await this.serversService.findById(serverId);
                    const detectedAt = this.crawlerStatusService.getRecaptchaDetectedAt(serverId);
                    return {
                        serverId,
                        serverCode: server.serverCode,
                        serverName: server.serverName,
                        detectedAt: detectedAt ?? new Date(),
                    };
                })
            );

            const activeServerResponse = activeServer
                ? {
                    ...activeServer,
                    durationSeconds: Math.floor((Date.now() - activeServer.startedAt.getTime()) / 1000),
                }
                : null;

            const upcomingTasks = this.orchestratorService.getUpcomingSchedule(8);

            return {
                success: true,
                activeServer: activeServerResponse,
                recaptchaBlocked,
                nextScheduledInSeconds,
                nextScheduledTask,
                upcomingTasks,
            };
        } catch (error) {
            this.logger.error('Error getting crawler status:', error);
            throw new InternalServerErrorException(`Failed to get crawler status: ${error.message}`);
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

    @Get('default-intervals')
    @GetDefaultIntervalsDecorator()
    async getDefaultIntervals() {
        this.logger.log('Default intervals requested');

        try {
            const intervals = this.orchestratorService.getDefaultIntervals();
            return {
                success: true,
                data: intervals
            };
        } catch (error) {
            this.logger.error('Error getting default intervals:', error);
            throw new InternalServerErrorException(`Failed to get default intervals: ${error.message}`);
        }
    }
} 