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
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';
import { BarbarianVillagesService } from '@/barbarian-villages/barbarian-villages.service';
import { ServerResponseDto } from '@/servers/dto';
import { PlemionaCookiesService } from '@/plemiona-cookies';

interface CrawlerTask {
    nextExecutionTime: Date;
    enabled: boolean;
    lastExecuted: Date | null;
    name: string;
}

interface ServerCrawlerPlan {
    serverId: number;
    serverCode: string;
    serverName: string;
    isActive: boolean;
    constructionQueue: CrawlerTask;
    scavenging: CrawlerTask & {
        optimalDelay: number | null;
    };
    miniAttacks: CrawlerTask & {
        nextTargetIndex: number;
        lastAttackTime: Date | null;
    };
    lastError: string | null;
    errorCount: number;
    lastSuccessfulExecution: Date | null;
}

interface MultiServerState {
    currentServerIndex: number;
    activeServers: ServerResponseDto[];
    serverPlans: Map<number, ServerCrawlerPlan>;
    isRotating: boolean;
}

@Injectable()
export class CrawlerOrchestratorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CrawlerOrchestratorService.name);
    private readonly credentials: PlemionaCredentials;

    // Multi-server state management
    private multiServerState: MultiServerState;
    private mainTimer: NodeJS.Timeout | null = null;
    private monitoringTimer: NodeJS.Timeout | null = null;

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

    // Error handling configuration
    private readonly MAX_ERROR_COUNT = 3; // Max errors before skipping server temporarily
    private readonly ERROR_COOLDOWN = 1000 * 60 * 15; // 15 minutes cooldown after max errors

    constructor(
        private readonly settingsService: SettingsService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
        private readonly serversService: ServersService,
        private readonly configService: ConfigService,
        private readonly crawlerService: CrawlerService,
        private readonly constructionQueueService: VillageConstructionQueueService,
        private readonly barbarianVillagesService: BarbarianVillagesService
    ) {
        // Initialize credentials from environment variables
        this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);
        this.validateCredentials();

        // Initialize multi-server state
        this.initializeMultiServerState();
    }

    async onModuleInit() {
        this.logger.log('🌐 Multi-Server CrawlerOrchestratorService initialized');
        this.startMonitoring();
    }

    async onModuleDestroy() {
        this.stopOrchestrator();
    }

    /**
     * Validates the credentials
     */
    private async validateCredentials(): Promise<void> {
        const serverName = await this.serversService.getServerName(1);
        const validation = AuthUtils.validateCredentials(this.credentials);
        if (!validation.isValid) {
            this.logger.warn(`Invalid credentials: missing fields: ${validation.missingFields.join(', ')}, errors: ${validation.errors.join(', ')}. Fallback to cookies will be attempted.`);
        } else {
            this.logger.log('Plemiona credentials loaded from environment variables successfully.');
        }
    }

    /**
     * Initializes the multi-server state
     */
    private initializeMultiServerState(): void {
        this.multiServerState = {
            currentServerIndex: 0,
            activeServers: [],
            serverPlans: new Map(),
            isRotating: false
        };

        this.logger.log('Multi-server state initialized');
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
            const activeServers = await this.serversService.findActiveServers();

            // Update server list
            this.multiServerState.activeServers = activeServers;

            // Initialize plans for new servers
            for (const server of activeServers) {
                if (!this.multiServerState.serverPlans.has(server.id)) {
                    this.initializeServerPlan(server);
                }
            }

            // Remove plans for inactive servers
            const activeServerIds = new Set(activeServers.map(s => s.id));
            for (const serverId of this.multiServerState.serverPlans.keys()) {
                if (!activeServerIds.has(serverId)) {
                    this.multiServerState.serverPlans.delete(serverId);
                    this.logger.log(`🗑️ Removed plan for inactive server ${serverId}`);
                }
            }

            // Reset rotation index if needed
            if (this.multiServerState.currentServerIndex >= activeServers.length) {
                this.multiServerState.currentServerIndex = 0;
            }

            this.logger.debug(`🔄 Active servers refreshed: ${activeServers.length} servers`);

        } catch (error) {
            this.logger.error('❌ Error refreshing active servers:', error);
        }
    }

    /**
     * Initializes crawler plan for a new server
     */
    private initializeServerPlan(server: ServerResponseDto): void {
        const now = new Date();
        const constructionDelay = this.getInitialConstructionInterval();
        const miniAttackDelay = this.getInitialMiniAttackInterval();

        const serverPlan: ServerCrawlerPlan = {
            serverId: server.id,
            serverCode: server.serverCode,
            serverName: server.serverName,
            isActive: server.isActive,
            constructionQueue: {
                nextExecutionTime: new Date(now.getTime() + constructionDelay),
                enabled: false,
                lastExecuted: null,
                name: 'Construction Queue'
            },
            scavenging: {
                nextExecutionTime: new Date(now.getTime() + 30000), // Start in 30 seconds
                enabled: false,
                lastExecuted: null,
                name: 'Scavenging',
                optimalDelay: null
            },
            miniAttacks: {
                nextExecutionTime: new Date(now.getTime() + miniAttackDelay),
                enabled: false,
                lastExecuted: null,
                name: 'Mini Attacks',
                nextTargetIndex: 0,
                lastAttackTime: null
            },
            lastError: null,
            errorCount: 0,
            lastSuccessfulExecution: null
        };

        this.multiServerState.serverPlans.set(server.id, serverPlan);
        this.logger.log(`✅ Initialized crawler plan for server ${server.serverCode} (${server.serverName})`);
    }

    /**
     * Checks if any server has orchestrator enabled
     */
    private async hasAnyOrchestratorEnabled(): Promise<boolean> {
        for (const server of this.multiServerState.activeServers) {
            try {
                const enabled = await this.isOrchestratorEnabled(server.id);
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
    private async updateServerTaskStates(serverId: number): Promise<void> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) return;

        try {
            plan.constructionQueue.enabled = await this.isConstructionQueueEnabled(serverId);
            plan.scavenging.enabled = await this.isScavengingEnabled(serverId);
            plan.miniAttacks.enabled = await this.isMiniAttacksEnabled(serverId);

            this.logger.debug(`📋 Server ${plan.serverCode} tasks: Construction=${plan.constructionQueue.enabled}, Scavenging=${plan.scavenging.enabled}, MiniAttacks=${plan.miniAttacks.enabled}`);

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

        this.logger.log(`⏰ Next task: ${taskType} on server ${plan.serverCode} in ${Math.round(delay / 1000)}s`);

        this.mainTimer = setTimeout(async () => {
            await this.executeServerTask(serverId, taskType);
        }, delay);
    }

    /**
     * Finds the next task to execute across all servers
     */
    private findNextTaskToExecute(): { task: CrawlerTask; serverId: number; taskType: string } | null {
        let earliestTask: { task: CrawlerTask; serverId: number; taskType: string } | null = null;
        let earliestTime = Number.MAX_SAFE_INTEGER;

        for (const [serverId, plan] of this.multiServerState.serverPlans) {
            // Skip servers with too many errors
            if (this.isServerInErrorCooldown(plan)) {
                this.logger.log(`🔄 Server ${plan.serverCode} is in error cooldown: ${plan.errorCount} < ${this.MAX_ERROR_COUNT}`);
                continue;
            }

            const tasks = [
                { task: plan.constructionQueue, type: 'Construction Queue' },
                { task: plan.scavenging, type: 'Scavenging' },
                { task: plan.miniAttacks, type: 'Mini Attacks' }
            ];

            for (const { task, type } of tasks) {
                if (task.enabled && task.nextExecutionTime.getTime() < earliestTime) {
                    earliestTime = task.nextExecutionTime.getTime();
                    earliestTask = { task, serverId, taskType: type };
                }
            }
        }

        return earliestTask;
    }

    /**
     * Checks if server is in error cooldown
     */
    private isServerInErrorCooldown(plan: ServerCrawlerPlan): boolean {
        if (plan.errorCount < this.MAX_ERROR_COUNT) {
            return false;
        }

        if (!plan.lastError) {
            return false;
        }

        // Parse the timestamp from lastError or use current time
        const lastErrorTime = plan.lastSuccessfulExecution || new Date();
        const cooldownEndTime = lastErrorTime.getTime() + this.ERROR_COOLDOWN;

        return Date.now() < cooldownEndTime;
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

        this.logger.log(`🚀 Executing ${taskType} for server ${plan.serverCode} (${plan.serverName})`);

        try {
            switch (taskType) {
                case 'Construction Queue':
                    await this.executeConstructionQueueTask(serverId);
                    this.updateNextConstructionTime(plan);
                    break;
                case 'Scavenging':
                    await this.executeScavengingTask(serverId);
                    await this.updateNextScavengingTime(plan);
                    break;
                case 'Mini Attacks':
                    await this.executeMiniAttacksTask(serverId);
                    this.updateNextMiniAttackTime(plan);
                    break;
                default:
                    this.logger.error(`❌ Unknown task type: ${taskType}`);
            }

            // Mark as successful
            plan.lastSuccessfulExecution = new Date();
            plan.errorCount = 0;
            plan.lastError = null;

            this.logger.log(`✅ ${taskType} completed successfully for server ${plan.serverCode}`);

        } catch (error) {
            this.handleServerTaskError(plan, taskType, error);
        }

        // Schedule next execution
        this.scheduleNextExecution();
    }

    /**
     * Handles error during server task execution
     */
    private handleServerTaskError(plan: ServerCrawlerPlan, taskType: string, error: any): void {
        plan.errorCount++;
        plan.lastError = `${taskType}: ${error.message || error}`;

        this.logger.error(`❌ Error executing ${taskType} for server ${plan.serverCode} (error ${plan.errorCount}/${this.MAX_ERROR_COUNT}):`, error);

        if (plan.errorCount >= this.MAX_ERROR_COUNT) {
            this.logger.warn(`⚠️ Server ${plan.serverCode} reached max error count. Entering cooldown for ${this.ERROR_COOLDOWN / 1000 / 60} minutes.`);
        }
    }

    /**
     * Executes construction queue processing for a server
     */
    private async executeConstructionQueueTask(serverId: number): Promise<void> {
        await this.constructionQueueService.processAndCheckConstructionQueue(serverId);
    }

    /**
     * Executes scavenging processing for a server
     */
    private async executeScavengingTask(serverId: number): Promise<void> {
        const { browser, page } = await createBrowserPage({ headless: true });

        try {
            const plan = this.multiServerState.serverPlans.get(serverId)!;
            const serverName = await this.serversService.getServerName(serverId);
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed for server ${plan.serverCode}: ${loginResult.error || 'Unknown error'}`);
            }

            await this.crawlerService.performScavenging(page, serverId);

        } finally {
            await browser.close();
        }
    }

    /**
     * Executes mini attacks on barbarian villages for a server
     */
    private async executeMiniAttacksTask(serverId: number): Promise<void> {
        const villageId = await this.settingsService.getSetting<{ value: string }>(serverId, SettingsKey.MINI_ATTACKS_VILLAGE_ID);
        if (!villageId) {
            this.logger.error(`❌ No village ID found for server ${serverId}`);
            return;
        }
        await this.barbarianVillagesService.executeMiniAttacks(serverId, villageId.value);
    }

    /**
     * Updates next construction queue execution time
     */
    private updateNextConstructionTime(plan: ServerCrawlerPlan): void {
        const delay = this.getRandomConstructionInterval();
        plan.constructionQueue.nextExecutionTime = new Date(Date.now() + delay);
        plan.constructionQueue.lastExecuted = new Date();

        this.logger.debug(`📅 Next construction queue for ${plan.serverCode}: ${plan.constructionQueue.nextExecutionTime.toLocaleString()}`);
    }

    /**
     * Updates next scavenging execution time based on optimal calculation
     */
    private async updateNextScavengingTime(plan: ServerCrawlerPlan): Promise<void> {
        try {
            const scavengingData = this.crawlerService.getScavengingTimeData();
            let optimalDelay = ScavengingUtils.calculateOptimalScheduleTime(scavengingData);

            if (optimalDelay === null || optimalDelay < 30) {
                optimalDelay = 300; // 5 minutes fallback
                this.logger.warn(`Using fallback scavenging delay for ${plan.serverCode}: 5 minutes`);
            }

            // Add random buffer to make it less predictable
            const bufferSeconds = Math.floor(Math.random() * 60) + 30; // 30-90 seconds
            optimalDelay += bufferSeconds;

            plan.scavenging.optimalDelay = optimalDelay;
            plan.scavenging.nextExecutionTime = new Date(Date.now() + (optimalDelay * 1000));
            plan.scavenging.lastExecuted = new Date();

            this.logger.debug(`📅 Next scavenging for ${plan.serverCode}: ${plan.scavenging.nextExecutionTime.toLocaleString()} (optimal: ${optimalDelay}s)`);

        } catch (error) {
            this.logger.error(`Error calculating optimal scavenging time for ${plan.serverCode}:`, error);
            // Fallback to 5 minutes
            plan.scavenging.nextExecutionTime = new Date(Date.now() + 300000);
            plan.scavenging.lastExecuted = new Date();
            this.logger.debug(`📅 Next scavenging for ${plan.serverCode} (fallback): ${plan.scavenging.nextExecutionTime.toLocaleString()}`);
        }
    }

    /**
     * Updates next mini attacks execution time
     */
    private updateNextMiniAttackTime(plan: ServerCrawlerPlan): void {
        const delay = this.getRandomMiniAttackInterval();
        plan.miniAttacks.nextExecutionTime = new Date(Date.now() + delay);
        plan.miniAttacks.lastExecuted = new Date();
        plan.miniAttacks.lastAttackTime = new Date();

        const delayMinutes = Math.round(delay / 1000 / 60);
        this.logger.debug(`📅 Next mini attack for ${plan.serverCode}: ${plan.miniAttacks.nextExecutionTime.toLocaleString()} (in ${delayMinutes} minutes)`);
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
     * Stops the crawler orchestrator
     */
    private stopOrchestrator(): void {
        this.logger.log('🛑 Stopping multi-server crawler orchestrator...');

        this.stopScheduler();

        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        this.logger.log('🛑 Multi-server crawler orchestrator stopped');
    }

    /**
     * Generates random interval for construction queue processing
     */
    private getRandomConstructionInterval(): number {
        return Math.floor(Math.random() * (this.MAX_CONSTRUCTION_INTERVAL - this.MIN_CONSTRUCTION_INTERVAL + 1)) + this.MIN_CONSTRUCTION_INTERVAL;
    }

    /**
     * Generates random interval for mini attacks
     */
    private getRandomMiniAttackInterval(): number {
        return Math.floor(Math.random() * (this.MAX_MINI_ATTACK_INTERVAL - this.MIN_MINI_ATTACK_INTERVAL + 1)) + this.MIN_MINI_ATTACK_INTERVAL;
    }

    /**
     * Generates initial 10 seconds interval for construction queue processing
     */
    private getInitialConstructionInterval(): number {
        return 10000;
    }

    /**
     * Generates initial 20 seconds interval for mini attacks
     */
    private getInitialMiniAttackInterval(): number {
        return 20000;
    }

    /**
     * Checks if orchestrator is enabled for a server
     */
    private async isOrchestratorEnabled(serverId: number): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(serverId, SettingsKey.CRAWLER_ORCHESTRATOR_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error(`Failed to check orchestrator setting for server ${serverId}:`, error);
            return false;
        }
    }

    /**
     * Checks if scavenging is enabled for a server
     */
    private async isScavengingEnabled(serverId: number): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(serverId, SettingsKey.AUTO_SCAVENGING_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error(`Failed to check scavenging setting for server ${serverId}:`, error);
            return false;
        }
    }

    /**
     * Checks if construction queue processing is enabled for a server
     */
    private async isConstructionQueueEnabled(serverId: number): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(serverId, SettingsKey.AUTO_CONSTRUCTION_QUEUE_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error(`Failed to check construction queue setting for server ${serverId}:`, error);
            return false;
        }
    }

    /**
     * Checks if mini attacks are enabled for a server
     */
    private async isMiniAttacksEnabled(serverId: number): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(serverId, SettingsKey.MINI_ATTACKS_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error(`Failed to check mini attacks setting for server ${serverId}:`, error);
            return false;
        }
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
     * Public method to manually start monitoring
     * This is useful when orchestrator settings are changed after application startup
     * and you need to force the orchestrator to check the new settings immediately
     */
    public async startMonitoringManually(): Promise<void> {
        this.logger.log('🔧 Manual monitoring start requested...');

        try {
            await this.checkAndStartOrchestrator();
            this.logger.log('✅ Manual monitoring check completed');
        } catch (error) {
            this.logger.error('❌ Error during manual monitoring start:', error);
            throw error;
        }
    }

    /**
     * Gets status information for all servers
     */
    public getMultiServerStatus(): any {
        const serverStatuses = Array.from(this.multiServerState.serverPlans.values()).map(plan => ({
            serverId: plan.serverId,
            serverCode: plan.serverCode,
            serverName: plan.serverName,
            isActive: plan.isActive,
            errorCount: plan.errorCount,
            lastError: plan.lastError,
            lastSuccessfulExecution: plan.lastSuccessfulExecution,
            tasks: {
                constructionQueue: {
                    enabled: plan.constructionQueue.enabled,
                    nextExecution: plan.constructionQueue.nextExecutionTime,
                    lastExecuted: plan.constructionQueue.lastExecuted
                },
                scavenging: {
                    enabled: plan.scavenging.enabled,
                    nextExecution: plan.scavenging.nextExecutionTime,
                    lastExecuted: plan.scavenging.lastExecuted,
                    optimalDelay: plan.scavenging.optimalDelay
                },
                miniAttacks: {
                    enabled: plan.miniAttacks.enabled,
                    nextExecution: plan.miniAttacks.nextExecutionTime,
                    lastExecuted: plan.miniAttacks.lastExecuted,
                    lastAttackTime: plan.miniAttacks.lastAttackTime
                }
            }
        }));

        return {
            activeServersCount: this.multiServerState.activeServers.length,
            currentServerIndex: this.multiServerState.currentServerIndex,
            isRotating: this.multiServerState.isRotating,
            schedulerActive: !!this.mainTimer,
            monitoringActive: !!this.monitoringTimer,
            servers: serverStatuses
        };
    }
} 