import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '@/settings/settings.service';
import { ServersService } from '@/servers/servers.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { CrawlerService } from './crawler.service';
import { VillageConstructionQueueService } from '@/village-construction-queue/village-construction-queue.service';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { createBrowserPage } from '@/utils/browser.utils';
import { BarbarianVillagesService } from '@/barbarian-villages/barbarian-villages.service';
import { ServerResponseDto } from '@/servers/dto';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { MiniAttackStrategiesService } from '@/mini-attack-strategies/mini-attack-strategies.service';
import { ArmyTrainingService } from '@/army-training/army-training.service';
import { ArmyTrainingStrategiesService } from '@/army-training/army-training-strategies.service';
import { PlayerVillagesService } from '@/player-villages/player-villages.service';
import { PlayerVillageAttackStrategiesService } from '@/player-villages/player-village-attack-strategies.service';
import * as ghostCursor from 'ghost-cursor-playwright';
import { NotificationsService } from '@/notifications/notifications.service';
import { Page } from 'playwright';
import { CrawlerExecutionLogsService } from '@/crawler-execution-logs/crawler-execution-logs.service';
import { ExecutionStatus } from '@/crawler-execution-logs/entities/crawler-execution-log.entity';
import { CrawlerTask, ServerCrawlerPlan, MultiServerState } from './operations/query/get-multi-server-status.operation';
import { updateServerTaskStatesOperation } from './operations/state-management/update-server-task-states.operation';
import { findNextTaskToExecuteOperation } from './operations/scheduling/find-next-task-to-execute.operation';
import { logDetailedTaskScheduleOperation } from './operations/monitoring/log-detailed-task-schedule.operation';
import { refreshActiveServersOperation } from './operations/state-management/refresh-active-servers.operation';
import { initializeServerPlanOperation } from './operations/state-management/initialize-server-plan.operation';
import { initializeMultiServerStateOperation } from './operations/state-management/initialize-multi-server-state.operation';
import { updateNextConstructionTimeOperation } from './operations/scheduling/update-next-construction-time.operation';
import { updateNextScavengingTimeOperation } from './operations/scheduling/update-next-scavenging-time.operation';
import { updateNextMiniAttackTimeOperation } from './operations/scheduling/update-next-mini-attack-time.operation';
import { updateNextArmyTrainingTimeOperation } from './operations/scheduling/update-next-army-training-time.operation';
import { updateNextPlayerVillageAttackTimeOperation } from './operations/scheduling/update-next-player-village-attack-time.operation';
import { updateNextExecutionTimeForFailedTaskOperation } from './operations/scheduling/update-next-execution-time-for-failed-task.operation';
import { getMultiServerStatusOperation } from './operations/query/get-multi-server-status.operation';
import { executeServerTaskOperation } from './operations/execution/execute-server-task.operation';
import { executeScavengingTaskOperation } from './operations/execution/execute-scavenging-task.operation';
import { executeConstructionQueueTaskOperation } from './operations/execution/execute-construction-queue-task.operation';
import { executeMiniAttacksTaskOperation } from './operations/execution/execute-mini-attacks-task.operation';
import { executeArmyTrainingTaskOperation } from './operations/execution/execute-army-training-task.operation';
import { executePlayerVillageAttacksTaskOperation } from './operations/execution/execute-player-village-attacks-task.operation';
import { validateOrchestratorEnabledOperation } from './operations/validation/validate-orchestrator-enabled.operation';

@Injectable()
export class CrawlerOrchestratorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CrawlerOrchestratorService.name);
    private readonly credentials: PlemionaCredentials;

    // Multi-server state management
    private multiServerState: MultiServerState;
    private mainTimer: NodeJS.Timeout | null = null;
    private monitoringTimer: NodeJS.Timeout | null = null;
    private memoryMonitoringTimer: NodeJS.Timeout | null = null;

    // Configuration constants
    private readonly MIN_CONSTRUCTION_INTERVAL = 1000 * 60 * 5; // 5 minutes
    private readonly MAX_CONSTRUCTION_INTERVAL = 1000 * 60 * 8; // 8 minutes
    private readonly BATCH_EXECUTION_DELAY = 10000; // 10 seconds between tasks in batch
    private readonly PROXIMITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
    private readonly MONITORING_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds
    private readonly SERVER_ROTATION_DELAY = 5000; // 5 seconds between servers

    // Mini attacks configuration
    private readonly MIN_MINI_ATTACK_INTERVAL = 1000 * 60 * 10; // 10 minutes
    private readonly MAX_MINI_ATTACK_INTERVAL = 1000 * 60 * 15; // 15 minutes

    // Army training configuration - will be loaded from settings with defaults
    private readonly DEFAULT_MIN_ARMY_TRAINING_INTERVAL = 1000 * 60 * 10; // 10 minutes
    private readonly DEFAULT_MAX_ARMY_TRAINING_INTERVAL = 1000 * 60 * 15; // 15 minutes



    constructor(
        private readonly settingsService: SettingsService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
        private readonly serversService: ServersService,
        private readonly configService: ConfigService,
        private readonly crawlerService: CrawlerService,
        private readonly constructionQueueService: VillageConstructionQueueService,
        private readonly barbarianVillagesService: BarbarianVillagesService,
        private readonly miniAttackStrategiesService: MiniAttackStrategiesService,
        private readonly armyTrainingService: ArmyTrainingService,
        private readonly armyTrainingStrategiesService: ArmyTrainingStrategiesService,
        private readonly playerVillagesService: PlayerVillagesService,
        private readonly notificationsService: NotificationsService,
        private readonly crawlerExecutionLogsService: CrawlerExecutionLogsService
    ) {
        // Initialize multi-server state
        this.initializeMultiServerState();
    }

    async onModuleInit() {
        this.logger.log('🌐 Multi-Server CrawlerOrchestratorService initialized');
        // this.resolveRepatch(219, false);
        this.startMonitoring();
        this.startMemoryMonitoring();
    }

    async onModuleDestroy() {
        this.stopOrchestrator();
    }

    /**
     * Initializes the multi-server state
     */
    private initializeMultiServerState(): void {
        this.multiServerState = initializeMultiServerStateOperation({
            logger: this.logger
        });
    }

    /**
     * Starts monitoring and checks orchestrator status periodically
     */
    private async startMonitoring(): Promise<void> {
        this.logger.log('🔍 Starting multi-server orchestrator monitoring...');

        // Check immediately if orchestrator should start
        await this.checkAndStartOrchestrator();

        // Set up periodic monitoring
        this.monitoringTimer = setInterval(async () => {
            await this.checkAndStartOrchestrator();
        }, this.MONITORING_INTERVAL);
    }

    /**
     * Checks if orchestrator should be enabled and starts/stops accordingly
     */
    private async checkAndStartOrchestrator(): Promise<void> {
        try {
            // Refresh active servers list
            await this.refreshActiveServers();

            if (this.multiServerState.activeServers.length === 0) {
                this.logger.warn('⚠️ No active servers found - orchestrator paused');
                this.stopScheduler();
                return;
            }

            // Check if any server has orchestrator enabled
            const hasOrchestratorEnabled = await this.hasAnyOrchestratorEnabled();

            if (hasOrchestratorEnabled) {
                if (!this.mainTimer) {
                    this.logger.log('🟢 Multi-server orchestrator enabled - starting scheduler...');
                    await this.updateAllServerTaskStates();
                    this.scheduleNextExecution();
                }
            } else {
                if (this.mainTimer) {
                    this.logger.log('🔴 Multi-server orchestrator disabled - stopping scheduler...');
                    this.stopScheduler();
                } else {
                    this.logger.debug('⚪ Multi-server orchestrator disabled - monitoring...');
                }
            }

        } catch (error) {
            this.logger.error('❌ Error during orchestrator check:', error);
        }
    }

    /**
     * Refreshes the list of active servers
     */
    private async refreshActiveServers(): Promise<void> {
        try {
            await refreshActiveServersOperation({
                multiServerState: this.multiServerState,
                logger: this.logger,
                serversService: this.serversService
            });
        } catch (error) {
            this.logger.error('❌ Error refreshing active servers:', error);
        }
    }

    /**
     * Initializes crawler plan for a new server
     */
    private initializeServerPlan(server: ServerResponseDto): void {
        const serverPlan = initializeServerPlanOperation(server, {
            logger: this.logger
        });
        this.multiServerState.serverPlans.set(server.id, serverPlan);
    }

    /**
     * Checks if any server has orchestrator enabled
     */
    private async hasAnyOrchestratorEnabled(): Promise<boolean> {
        for (const server of this.multiServerState.activeServers) {
            try {
                const enabled = await validateOrchestratorEnabledOperation(server.id, {
                    settingsService: this.settingsService,
                    logger: this.logger
                });
                if (enabled) {
                    return true;
                }
            } catch (error) {
                this.logger.error(`❌ Error checking orchestrator for server ${server.id}:`, error);
            }
        }
        return false;
    }

    /**
     * Updates task enabled states for all servers
     */
    private async updateAllServerTaskStates(): Promise<void> {
        for (const server of this.multiServerState.activeServers) {
            try {
                await this.updateServerTaskStates(server.id);
            } catch (error) {
                this.logger.error(`❌ Error updating task states for server ${server.id}:`, error);
            }
        }
    }

    /**
     * Updates task enabled states for a specific server
     */
    public async updateServerTaskStates(serverId: number): Promise<void> {
        try {
            // await updateServerTaskStatesOperation(serverId, {
            //     multiServerState: this.multiServerState,
            //     logger: this.logger,
            //     settingsService: this.settingsService
            // });
            // this.logDetailedTaskSchedule();
            // this.scheduleNextExecution();
        } catch (error) {
            this.logger.error(`❌ Error updating task states for server ${serverId}:`, error);
        }
    }

    /**
     * Main scheduler that determines which task to execute next across all servers
     */
    private scheduleNextExecution(): void {
        if (this.mainTimer) {
            clearTimeout(this.mainTimer);
            this.mainTimer = null;
        }

        const nextTask = this.findNextTaskToExecute();

        if (!nextTask) {
            this.logger.log('⚪ No tasks scheduled - checking again in 1 minute...');
            this.mainTimer = setTimeout(() => {
                this.scheduleNextExecution();
            }, 60000);
            return;
        }

        const { task, serverId, taskType } = nextTask;
        const delay = Math.max(0, task.nextExecutionTime.getTime() - Date.now());
        const plan = this.multiServerState.serverPlans.get(serverId)!;

        this.logDetailedTaskSchedule();
        this.logger.log(`⏰ Next task: ${taskType} on server ${plan.serverCode} in ${Math.round(delay / 1000)}s`);

        this.mainTimer = setTimeout(async () => {
            await this.executeServerTask(serverId, taskType);
        }, delay);
    }

    /**
     * Finds the next task to execute across all servers
     */
    private findNextTaskToExecute(): { task: CrawlerTask; serverId: number; taskType: string } | null {
        return findNextTaskToExecuteOperation({
            multiServerState: this.multiServerState
        });
    }

    /**
     * Executes a task for a specific server
     */
    private async executeServerTask(serverId: number, taskType: string): Promise<void> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) {
            this.logger.error(`❌ No plan found for server ${serverId}`);
            this.scheduleNextExecution();
            return;
        }

        await executeServerTaskOperation(serverId, taskType, {
            multiServerState: this.multiServerState,
            crawlerExecutionLogsService: this.crawlerExecutionLogsService,
            crawlerService: this.crawlerService,
            constructionQueueService: this.constructionQueueService,
            miniAttackStrategiesService: this.miniAttackStrategiesService,
            serversService: this.serversService,
            barbarianVillagesService: this.barbarianVillagesService,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService,
            playerVillagesService: this.playerVillagesService,
            armyTrainingService: this.armyTrainingService,
            armyTrainingStrategiesService: this.armyTrainingStrategiesService,
            settingsService: this.settingsService,
            logger: this.logger
        });

        // Schedule next execution
        this.scheduleNextExecution();
    }

    /**
     * Updates next execution time for a failed task to prevent immediate retry
     */
    private updateNextExecutionTimeForFailedTask(plan: ServerCrawlerPlan, taskType: string): void {
        updateNextExecutionTimeForFailedTaskOperation(plan, taskType, {
            logger: this.logger
        });
    }

    /**
     * Executes construction queue processing for a server
     */
    private async executeConstructionQueueTask(serverId: number): Promise<void> {
        await executeConstructionQueueTaskOperation(serverId, {
            constructionQueueService: this.constructionQueueService,
            logger: this.logger
        });
    }

    /**
     * Executes scavenging processing for a server
     */
    private async executeScavengingTask(serverId: number): Promise<void> {
        await executeScavengingTaskOperation(serverId, {
            crawlerService: this.crawlerService,
            logger: this.logger
        });
    }

    /**
     * Executes mini attacks on barbarian villages for a server
     */
    private async executeMiniAttacksTask(serverId: number): Promise<void> {
        await executeMiniAttacksTaskOperation(serverId, {
            miniAttackStrategiesService: this.miniAttackStrategiesService,
            serversService: this.serversService,
            barbarianVillagesService: this.barbarianVillagesService,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService,
            logger: this.logger
        });
    }

    public async checkBotProtection(serverId: number, page: Page): Promise<void> {
        try {
            const botProtectionElement = await page.$('#botprotection_quest');
            if (botProtectionElement) {
                this.logger.warn(`🚨 Bot protection detected on server ${serverId} during mini attacks execution`);

                // Send notification to all users about captcha detection
                await this.notificationsService.createNotificationForAllUsers({
                    title: 'Wykryto reCAPTCHA',
                    body: `Bot zatrzymał się na serwerze ${serverId} podczas wykonywania ataków. Wykryto ochronę botową - wymagane odblokowanie reCAPTCHA.`
                });
            }
        } catch (checkError) {
            this.logger.error(`❌ Error checking for bot protection on server ${serverId}:`, checkError);
        }
    }

    /**
     * Executes army training for a server
     */
    private async executeArmyTrainingTask(serverId: number): Promise<void> {
        await executeArmyTrainingTaskOperation(serverId, {
            armyTrainingService: this.armyTrainingService,
            armyTrainingStrategiesService: this.armyTrainingStrategiesService,
            logger: this.logger
        });
    }

    /**
     * Updates next construction queue execution time
     */
    private updateNextConstructionTime(plan: ServerCrawlerPlan): void {
        updateNextConstructionTimeOperation(plan, {
            logger: this.logger
        });
    }

    /**
     * Updates next scavenging execution time based on optimal calculation
     */
    private async updateNextScavengingTime(plan: ServerCrawlerPlan): Promise<void> {
        const scavengingData = this.crawlerService.getScavengingTimeData();
        updateNextScavengingTimeOperation(plan, {
            scavengingTimeData: scavengingData,
            logger: this.logger
        });
    }

    /**
     * Updates next mini attacks execution time
     */
    private async updateNextMiniAttackTime(plan: ServerCrawlerPlan): Promise<void> {
        await updateNextMiniAttackTimeOperation(plan, plan.serverId, {
            settingsService: this.settingsService,
            logger: this.logger
        });
    }

    /**
     * Executes player village attacks for a server
     */
    private async executePlayerVillageAttacksTask(serverId: number): Promise<void> {
        await executePlayerVillageAttacksTaskOperation(serverId, {
            playerVillagesService: this.playerVillagesService,
            logger: this.logger
        });
    }

    /**
     * Updates next player village attacks execution time
     */
    private async updateNextPlayerVillageAttackTime(plan: ServerCrawlerPlan): Promise<void> {
        await updateNextPlayerVillageAttackTimeOperation(plan, plan.serverId, {
            settingsService: this.settingsService,
            logger: this.logger
        });
    }

    /**
     * Updates next army training execution time
     */
    private async updateNextArmyTrainingTime(plan: ServerCrawlerPlan): Promise<void> {
        await updateNextArmyTrainingTimeOperation(plan, plan.serverId, {
            settingsService: this.settingsService,
            logger: this.logger
        });
    }

    /**
     * Stops the main scheduler
     */
    private stopScheduler(): void {
        if (this.mainTimer) {
            clearTimeout(this.mainTimer);
            this.mainTimer = null;
        }
    }

    /**
     * Starts memory monitoring
     */
    private startMemoryMonitoring(): void {
        this.logger.log('📊 Starting memory monitoring...');

        this.memoryMonitoringTimer = setInterval(() => {
            const memUsage = process.memoryUsage();
            const formatBytes = (bytes: number) => Math.round(bytes / 1024 / 1024);

            this.logger.log('📊 Memory Usage:', {
                rss: `${formatBytes(memUsage.rss)} MB`,
                heapUsed: `${formatBytes(memUsage.heapUsed)} MB`,
                heapTotal: `${formatBytes(memUsage.heapTotal)} MB`,
                external: `${formatBytes(memUsage.external)} MB`,
                arrayBuffers: `${formatBytes(memUsage.arrayBuffers)} MB`,
                timestamp: new Date().toISOString()
            });
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Stops the crawler orchestrator
     */
    private stopOrchestrator(): void {
        this.logger.log('🛑 Stopping multi-server crawler orchestrator...');

        this.stopScheduler();

        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        if (this.memoryMonitoringTimer) {
            clearInterval(this.memoryMonitoringTimer);
            this.memoryMonitoringTimer = null;
        }

        this.logger.log('🛑 Multi-server crawler orchestrator stopped');
    }

    /**
     * Public method to manually trigger scavenging for a specific server
     */
    public async triggerScavenging(serverId: number): Promise<void> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) {
            throw new Error(`Server ${serverId} not found`);
        }

        this.logger.log(`🔧 Manually triggering scavenging for server ${plan.serverCode}...`);

        try {
            await this.executeScavengingTask(serverId);
            this.logger.log(`✅ Manual scavenging completed successfully for server ${plan.serverCode}`);
        } catch (error) {
            this.logger.error(`❌ Error during manual scavenging for server ${plan.serverCode}:`, error);
            throw error;
        }
    }

    /**
     * Public method to manually trigger construction queue processing for a specific server
     */
    public async triggerConstructionQueue(serverId: number): Promise<void> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) {
            throw new Error(`Server ${serverId} not found`);
        }

        this.logger.log(`🔧 Manually triggering construction queue for server ${plan.serverCode}...`);

        try {
            await this.executeConstructionQueueTask(serverId);
            this.logger.log(`✅ Manual construction queue completed successfully for server ${plan.serverCode}`);
        } catch (error) {
            this.logger.error(`❌ Error during manual construction queue for server ${plan.serverCode}:`, error);
            throw error;
        }
    }

    /**
     * Public method to manually trigger mini attacks for a specific server
     */
    public async triggerMiniAttacks(serverId: number): Promise<void> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) {
            throw new Error(`Server ${serverId} not found`);
        }

        this.logger.log(`🔧 Manually triggering mini attacks for server ${plan.serverCode}...`);

        try {
            await this.executeMiniAttacksTask(serverId);
            this.logger.log(`✅ Manual mini attacks completed successfully for server ${plan.serverCode}`);
        } catch (error) {
            this.logger.error(`❌ Error during manual mini attacks for server ${plan.serverCode}:`, error);
            throw error;
        }
    }

    /**
     * Public method to manually trigger army training for a specific server
     */
    public async triggerArmyTraining(serverId: number): Promise<void> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) {
            throw new Error(`Server ${serverId} not found`);
        }

        this.logger.log(`🔧 Manually triggering army training for server ${plan.serverCode}...`);

        try {
            await this.executeArmyTrainingTask(serverId);
            this.logger.log(`✅ Manual army training completed successfully for server ${plan.serverCode}`);
        } catch (error) {
            this.logger.error(`❌ Error during manual army training for server ${plan.serverCode}:`, error);
            throw error;
        }
    }

    /**
     * Public method to manually trigger player village attacks for a specific server
     */
    public async triggerPlayerVillageAttacks(serverId: number): Promise<void> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) {
            throw new Error(`Server ${serverId} not found`);
        }

        this.logger.log(`🔧 Manually triggering player village attacks for server ${plan.serverCode}...`);

        try {
            await this.executePlayerVillageAttacksTask(serverId);
            this.logger.log(`✅ Manual player village attacks completed successfully for server ${plan.serverCode}`);
        } catch (error) {
            this.logger.error(`❌ Error during manual player village attacks for server ${plan.serverCode}:`, error);
            throw error;
        }
    }

    /**
     * Public method to manually start monitoring
     * This is useful when orchestrator settings are changed after application startup
     * and you need to force the orchestrator to check the new settings immediately
     */
    public async startMonitoringManually(): Promise<void> {
        this.logger.log('🔧 Manual monitoring start requested...');

        try {
            await this.checkAndStartOrchestrator();
            this.logDetailedTaskSchedule();
            this.logger.log('✅ Manual monitoring check completed');
        } catch (error) {
            this.logger.error('❌ Error during manual monitoring start:', error);
            throw error;
        }
    }

    /**
     * Logs detailed information about all upcoming tasks and their execution times
     */
    private logDetailedTaskSchedule(): void {
        logDetailedTaskScheduleOperation({
            multiServerState: this.multiServerState,
            logger: this.logger
        });
    }

    /**
     * Gets status information for all servers
     */
    public getMultiServerStatus(): any {
        return getMultiServerStatusOperation({
            multiServerState: this.multiServerState,
            mainTimer: this.mainTimer,
            monitoringTimer: this.monitoringTimer
        });
    }
} 