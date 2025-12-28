import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
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
import { GlobalSettingsService } from '@/settings/global-settings.service';
import { ExecutionStatus } from '@/crawler-execution-logs/entities/crawler-execution-log.entity';
import { CrawlerTask, ServerCrawlerPlan, MultiServerState, MultiServerStatusResponse, ManualTask, ManualTaskType } from './operations/query/get-multi-server-status.operation';
import { updateServerTaskStatesOperation } from './operations/state-management/update-server-task-states.operation';
import { findNextTaskToExecuteOperation, NextTaskResult } from './operations/scheduling/find-next-task-to-execute.operation';
import { addManualTaskOperation, AddManualTaskResult, getManualTaskByIdOperation, cleanupCompletedManualTasksOperation } from './operations/manual-tasks/add-manual-task.operation';
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
import { getInitialIntervalsOperation } from './operations/calculations/get-initial-intervals.operation';

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
        @Inject(forwardRef(() => CrawlerService))
        private readonly crawlerService: CrawlerService,
        private readonly constructionQueueService: VillageConstructionQueueService,
        private readonly barbarianVillagesService: BarbarianVillagesService,
        private readonly miniAttackStrategiesService: MiniAttackStrategiesService,
        private readonly armyTrainingService: ArmyTrainingService,
        private readonly armyTrainingStrategiesService: ArmyTrainingStrategiesService,
        private readonly playerVillagesService: PlayerVillagesService,
        private readonly notificationsService: NotificationsService,
        private readonly crawlerExecutionLogsService: CrawlerExecutionLogsService,
        private readonly globalSettingsService: GlobalSettingsService
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
        const monitoringEnabled = await this.isMonitoringEnabled();

        if (!monitoringEnabled) {
            this.logger.warn('🔌 Orchestrator monitoring disabled globally – not starting.');
            this.stopMonitoringTimer();
            this.stopScheduler();
            return;
        }

        this.logger.log('🔍 Starting multi-server orchestrator monitoring...');

        // Check immediately if orchestrator should start
        await this.checkAndStartOrchestrator();

        // Set up periodic monitoring
        this.stopMonitoringTimer();
        this.monitoringTimer = setInterval(async () => {
            const enabled = await this.isMonitoringEnabled();
            if (!enabled) {
                this.logger.warn('🔌 Monitoring disabled globally – stopping timers.');
                this.stopMonitoringTimer();
                this.stopScheduler();
                return;
            }
            await this.checkAndStartOrchestrator();
        }, this.MONITORING_INTERVAL);
    }

    /**
     * Checks if orchestrator should be enabled and starts/stops accordingly
     */
    private async checkAndStartOrchestrator(): Promise<void> {
        try {
            const monitoringEnabled = await this.isMonitoringEnabled();
            if (!monitoringEnabled) {
                this.logger.debug('⚪ Global monitoring disabled - skipping orchestrator check');
                this.stopScheduler();
                return;
            }
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
            await updateServerTaskStatesOperation(serverId, {
                multiServerState: this.multiServerState,
                logger: this.logger,
                settingsService: this.settingsService
            });
            this.logDetailedTaskSchedule();
            this.scheduleNextExecution();
        } catch (error) {
            this.logger.error(`❌ Error updating task states for server ${serverId}:`, error);
        }
    }

    /**
     * Refreshes active servers list and updates scheduler
     * Should be called when server status changes (enable/disable)
     */
    public async refreshActiveServersAndSchedule(): Promise<void> {
        try {
            const monitoringEnabled = await this.isMonitoringEnabled();
            if (!monitoringEnabled) {
                this.logger.debug('⚪ Global monitoring disabled - stopping scheduler after server status change');
                this.stopScheduler();
                return;
            }

            await this.refreshActiveServers();

            if (this.multiServerState.activeServers.length === 0) {
                this.logger.warn('⚠️ No active servers found - stopping scheduler after server status change');
                this.stopScheduler();
                return;
            }

            await this.updateAllServerTaskStates();
            
            // Check if orchestrator should be running
            const hasOrchestratorEnabled = await this.hasAnyOrchestratorEnabled();
            if (hasOrchestratorEnabled) {
                if (!this.mainTimer) {
                    this.logger.log('🟢 Refreshing scheduler after server status change...');
                    this.scheduleNextExecution();
                } else {
                    // Re-schedule next execution with updated server list
                    this.scheduleNextExecution();
                }
            } else {
                if (this.mainTimer) {
                    this.logger.log('🔴 Multi-server orchestrator disabled - stopping scheduler after server status change...');
                    this.stopScheduler();
                } else {
                    this.logger.debug('⚪ Multi-server orchestrator disabled - monitoring...');
                }
            }
        } catch (error) {
            this.logger.error('❌ Error refreshing servers and scheduler:', error);
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

        // Cleanup old completed manual tasks (older than 1 hour)
        cleanupCompletedManualTasksOperation(60 * 60 * 1000, {
            multiServerState: this.multiServerState,
            logger: this.logger
        });

        const nextTask = this.findNextTaskToExecute();

        if (!nextTask) {
            this.logger.log('⚪ No tasks scheduled - checking again in 1 minute...');
            this.mainTimer = setTimeout(() => {
                this.scheduleNextExecution();
            }, 60000);
            return;
        }

        const { task, serverId, taskType, isManualTask } = nextTask;

        // Calculate delay based on task type
        let delay: number;
        if (isManualTask) {
            // Manual tasks run immediately when ready
            delay = Math.max(0, (task as ManualTask).scheduledFor.getTime() - Date.now());
        } else {
            delay = Math.max(0, (task as CrawlerTask).nextExecutionTime.getTime() - Date.now());
        }

        // Get server info for logging (manual tasks may not have a server plan)
        const plan = this.multiServerState.serverPlans.get(serverId);
        const serverInfo = plan ? plan.serverCode : `server ${serverId}`;

        this.logDetailedTaskSchedule();
        this.logger.log(`⏰ Next task: ${taskType} on ${serverInfo} in ${Math.round(delay / 1000)}s`);

        this.mainTimer = setTimeout(async () => {
            await this.executeServerTask(serverId, taskType, nextTask);
        }, delay);
    }

    /**
     * Finds the next task to execute across all servers
     */
    private findNextTaskToExecute(): NextTaskResult | null {
        return findNextTaskToExecuteOperation({
            multiServerState: this.multiServerState
        });
    }

    /**
     * Executes a task for a specific server
     */
    private async executeServerTask(serverId: number, taskType: string, nextTaskResult?: NextTaskResult): Promise<void> {
        // For manual tasks, we don't need a server plan
        if (!nextTaskResult?.isManualTask) {
            const plan = this.multiServerState.serverPlans.get(serverId);
            if (!plan) {
                this.logger.error(`❌ No plan found for server ${serverId}`);
                this.scheduleNextExecution();
                return;
            }
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
        }, nextTaskResult);

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

            const rss = formatBytes(memUsage.rss);
            const heapUsed = formatBytes(memUsage.heapUsed);
            const heapTotal = formatBytes(memUsage.heapTotal);
            const external = formatBytes(memUsage.external);
            const arrayBuffers = formatBytes(memUsage.arrayBuffers);
            const timestamp = new Date().toISOString();
            const time = new Date().toLocaleTimeString();
            const table = `
┌─────────────────────┬──────────────┐
│ Metric              │ Value        │
├─────────────────────┼──────────────┤
│ RSS                 │ ${String(rss).padEnd(9)} MB │
│ Heap Used           │ ${String(heapUsed).padEnd(9)} MB │
│ Heap Total          │ ${String(heapTotal).padEnd(9)} MB │
│ External            │ ${String(external).padEnd(9)} MB │
│ Array Buffers       │ ${String(arrayBuffers).padEnd(9)} MB │
│ Timestamp           │ ${String(time).padEnd(12)} │
└─────────────────────┴──────────────┘`;

            this.logger.log(`📊 Memory Usage:${table}`);
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Clears all server plans and active servers from memory
     */
    private clearServerPlans(): void {
        this.multiServerState.serverPlans.clear();
        this.multiServerState.activeServers = [];
        this.multiServerState.currentServerIndex = 0;
        this.multiServerState.isRotating = false;
        this.logger.log('🗑️ Server plans cleared from memory');
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

        this.clearServerPlans();

        this.logger.log('🛑 Multi-server crawler orchestrator stopped');
    }

    public async stopOrchestratorPublic(): Promise<void> {
        this.stopOrchestrator();
    }

    /**
     * Public method to manually trigger scavenging for a specific server
     * @returns Object with serverCode, serverName and autoScavengingEnabled flag for response message
     */
    public async triggerScavenging(serverId: number): Promise<{ serverCode: string; serverName: string; autoScavengingEnabled: boolean }> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) {
            throw new Error(`Server ${serverId} not found`);
        }

        this.logger.log(`🔧 Manually triggering scavenging for server ${plan.serverCode}...`);

        // Check if auto-scavenging is enabled before executing task
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(
                serverId,
                SettingsKey.AUTO_SCAVENGING_ENABLED
            );
            const autoScavengingEnabled = setting?.value === true;

            if (!autoScavengingEnabled) {
                this.logger.warn(`⚠️ Auto-scavenging is disabled for server ${plan.serverCode} (${plan.serverName}). Manual trigger will not run the bot.`);
                return {
                    serverCode: plan.serverCode,
                    serverName: plan.serverName,
                    autoScavengingEnabled: false
                };
            }
        } catch (error) {
            this.logger.error(`❌ Failed to check auto-scavenging setting for server ${plan.serverCode}:`, error);
            // In case of error, treat as disabled to be safe
            return {
                serverCode: plan.serverCode,
                serverName: plan.serverName,
                autoScavengingEnabled: false
            };
        }

        try {
            await this.executeScavengingTask(serverId);
            this.logger.log(`✅ Manual scavenging completed successfully for server ${plan.serverCode}`);
            return {
                serverCode: plan.serverCode,
                serverName: plan.serverName,
                autoScavengingEnabled: true
            };
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
            await this.startMonitoring();
            this.logDetailedTaskSchedule();
            this.logger.log('✅ Manual monitoring check completed');
        } catch (error) {
            this.logger.error('❌ Error during manual monitoring start:', error);
            throw error;
        }
    }

    /**
     * Reads global monitoring flag
     */
    private async isMonitoringEnabled(): Promise<boolean> {
        const setting = await this.globalSettingsService.getGlobalSetting<{ value: boolean }>(
            SettingsKey.CRAWLER_ORCHESTRATOR_MONITORING_ENABLED
        );
        return setting?.value !== false;
    }

    /**
     * Clears monitoring interval timer
     */
    private stopMonitoringTimer(): void {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
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
    public async getMultiServerStatus(): Promise<MultiServerStatusResponse> {
        const monitoringEnabled = await this.isMonitoringEnabled();

        if (!monitoringEnabled) {
            const baseStatus = getMultiServerStatusOperation({
                multiServerState: this.multiServerState,
                mainTimer: null,
                monitoringTimer: null
            });

            return {
                ...baseStatus,
                schedulerActive: false,
                monitoringActive: false
            };
        }

        return getMultiServerStatusOperation({
            multiServerState: this.multiServerState,
            mainTimer: this.mainTimer,
            monitoringTimer: this.monitoringTimer
        });
    }

    /**
     * Gets default intervals used when initializing server plans
     * @returns Default intervals in milliseconds for all task types
     */
    public getDefaultIntervals(): {
        constructionQueue: number;
        scavenging: number;
        miniAttacks: number;
        playerVillageAttacks: number;
        armyTraining: number;
    } {
        const intervals = getInitialIntervalsOperation();
        
        return {
            constructionQueue: intervals.construction,
            scavenging: 30000, // Hardcoded in initialize-server-plan.operation.ts
            miniAttacks: intervals.miniAttack,
            playerVillageAttacks: intervals.playerVillageAttack,
            armyTraining: intervals.armyTraining
        };
    }

    // ========================
    // Manual Task Queue Methods
    // ========================

    /**
     * Queues a manual task for execution
     * Manual tasks are executed ASAP but don't interrupt scheduled tasks
     * 
     * @param type Type of manual task
     * @param serverId Server ID for the task
     * @param payload Task-specific payload data
     * @returns Result with taskId, queuePosition, and estimatedWaitTime
     */
    public queueManualTask(
        type: ManualTaskType,
        serverId: number,
        payload: unknown
    ): AddManualTaskResult {
        const result = addManualTaskOperation(
            { type, serverId, payload },
            { multiServerState: this.multiServerState, logger: this.logger }
        );

        // Reschedule to pick up the new manual task if needed
        this.scheduleNextExecution();

        return result;
    }

    /**
     * Gets all tasks currently in the manual task queue
     * @returns Array of manual tasks
     */
    public getManualTaskQueue(): ManualTask[] {
        return [...this.multiServerState.manualTaskQueue];
    }

    /**
     * Gets a specific manual task by its ID
     * @param taskId Task ID to find
     * @returns Manual task or null if not found
     */
    public getManualTaskStatus(taskId: string): ManualTask | null {
        return getManualTaskByIdOperation(taskId, {
            multiServerState: this.multiServerState
        });
    }

    /**
     * Gets the number of pending manual tasks
     * @returns Count of pending tasks
     */
    public getPendingManualTasksCount(): number {
        return this.multiServerState.manualTaskQueue.filter(t => t.status === 'pending').length;
    }

    /**
     * Estimates wait time for a new manual task
     * Based on current queue position and average task duration
     * @returns Estimated wait time in seconds
     */
    public getEstimatedWaitTimeForNewTask(): number {
        const pendingCount = this.getPendingManualTasksCount();
        const executingCount = this.multiServerState.manualTaskQueue.filter(t => t.status === 'executing').length;
        
        // Assume ~60 seconds per task as a rough estimate
        const averageTaskDuration = 60;
        return (pendingCount + executingCount) * averageTaskDuration;
    }
} 