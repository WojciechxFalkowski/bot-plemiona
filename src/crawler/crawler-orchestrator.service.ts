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
import { MiniAttackStrategiesService } from '@/mini-attack-strategies/mini-attack-strategies.service';
import { ArmyTrainingService } from '@/army-training/army-training.service';
import { ArmyTrainingStrategiesService } from '@/army-training/army-training-strategies.service';
import { PlayerVillagesService } from '@/player-villages/player-villages.service';
import { PlayerVillageAttackStrategiesService } from '@/player-villages/player-village-attack-strategies.service';
import * as ghostCursor from 'ghost-cursor-playwright';
import { NotificationsService } from '@/notifications/notifications.service';
import { Page } from 'playwright';

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
    playerVillageAttacks: CrawlerTask & {
        nextTargetIndex: number;
        lastAttackTime: Date | null;
    };
    armyTraining: CrawlerTask & {
        villageId: string | null;
    };
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
        private readonly notificationsService: NotificationsService
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
        this.logger.log("Initialize server plan", server.id);
        const now = new Date();
        const constructionDelay = this.getInitialConstructionInterval();
        const miniAttackDelay = this.getInitialMiniAttackInterval();
        const playerVillageAttackDelay = this.getInitialPlayerVillageAttackInterval();
        const armyTrainingDelay = this.getInitialArmyTrainingInterval();

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
            playerVillageAttacks: {
                nextExecutionTime: new Date(now.getTime() + playerVillageAttackDelay), // Use same delay as mini attacks initially
                enabled: false,
                lastExecuted: null,
                name: 'Player Village Attacks',
                nextTargetIndex: 0,
                lastAttackTime: null
            },
            armyTraining: {
                nextExecutionTime: new Date(now.getTime() + armyTrainingDelay),
                enabled: false,
                lastExecuted: null,
                name: 'Army Training',
                villageId: null
            },
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
    public async updateServerTaskStates(serverId: number): Promise<void> {
        const plan = this.multiServerState.serverPlans.get(serverId);
        if (!plan) return;

        try {
            plan.constructionQueue.enabled = await this.isConstructionQueueEnabled(serverId);
            plan.scavenging.enabled = await this.isScavengingEnabled(serverId);
            plan.miniAttacks.enabled = await this.isMiniAttacksEnabled(serverId);
            plan.playerVillageAttacks.enabled = await this.isPlayerVillageAttacksEnabled(serverId);
            plan.armyTraining.enabled = await this.isArmyTrainingEnabled(serverId);

            this.logger.debug(`📋 Server ${plan.serverCode} tasks: Construction=${plan.constructionQueue.enabled}, Scavenging=${plan.scavenging.enabled}, MiniAttacks=${plan.miniAttacks.enabled}, PlayerVillageAttacks=${plan.playerVillageAttacks.enabled}, ArmyTraining=${plan.armyTraining.enabled}`);
            this.logDetailedTaskSchedule();
            this.scheduleNextExecution();
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
        let earliestTask: { task: CrawlerTask; serverId: number; taskType: string } | null = null;
        let earliestTime = Number.MAX_SAFE_INTEGER;

        for (const [serverId, plan] of this.multiServerState.serverPlans) {
            const tasks = [
                { task: plan.constructionQueue, type: 'Construction Queue' },
                { task: plan.scavenging, type: 'Scavenging' },
                { task: plan.miniAttacks, type: 'Mini Attacks' },
                { task: plan.playerVillageAttacks, type: 'Player Village Attacks' },
                { task: plan.armyTraining, type: 'Army Training' }
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

    public async resolveRepatch(serverId: number, headless: boolean): Promise<void> {
        this.logger.log(`🔧 Starting captcha resolution for server ${serverId}...`);

        let browser: any = null;

        try {
            // 1. Login and select world
            const browserPage = await createBrowserPage({ headless: headless });
            browser = browserPage.browser;
            const { page } = browserPage;
            const serverName = await this.serversService.getServerName(serverId);

            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed for server ${serverId}: ${loginResult.error || 'Unknown error'}`);
            }

            this.logger.log(`✅ Successfully logged in for server ${serverId}, starting captcha resolution...`);

            // 2. Click on bot protection quest element
            await this.clickBotProtectionQuest(page);

            // 3. Click on the captcha button to open hCaptcha
            await this.clickCaptchaButton(page);

            // 4. Resolve the captcha using ghost-cursor-playwright
            await this.resolveCaptcha(page);

            this.logger.log(`✅ Captcha resolution completed successfully for server ${serverId}`);

        } catch (error) {
            this.logger.error(`❌ Error during captcha resolution for server ${serverId}:`, error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Clicks on the bot protection quest element
     */
    private async clickBotProtectionQuest(page: any): Promise<void> {
        this.logger.log('🔍 Looking for bot protection quest element...');

        try {
            await page.evaluate(() => {
                const element = document.querySelector("td.botprotection_quest");
                if (element) {
                    (element as HTMLElement).click();
                } else {
                    throw new Error('Bot protection quest element not found');
                }
            });

            this.logger.log('✅ Bot protection quest element clicked');

            // Wait a bit for any animations or page updates
            await page.waitForTimeout(1000);

        } catch (error) {
            this.logger.error('❌ Error clicking bot protection quest element:', error);
        }
    }

    /**
     * Clicks on the captcha button to open hCaptcha
     */
    private async clickCaptchaButton(page: any): Promise<void> {
        this.logger.log('🔍 Looking for captcha button...');

        try {
            await page.evaluate(() => {
                const element = document.querySelector("td.bot-protection-row a.btn.btn-default");
                if (element) {
                    (element as HTMLElement).click();
                } else {
                    throw new Error('Captcha button not found');
                }
            });

            this.logger.log('✅ Captcha button clicked');

            // Wait for the captcha iframe to load
            await page.waitForTimeout(2000);

        } catch (error) {
            this.logger.error('❌ Error clicking captcha button:', error);
        }
    }

    /**
     * Resolves the hCaptcha using ghost-cursor-playwright
     */
    private async resolveCaptcha(page: any): Promise<void> {
        this.logger.log('🤖 Starting captcha resolution with ghost-cursor...');

        try {
            // Create ghost cursor instance
            console.log("v1");
            const cursor = await ghostCursor.createCursor(page);
            console.log("v2");
            const vector = await cursor.getActualPosOfMouse();
            console.log("vector of mouse");
            console.log(vector);


            // Wait for the hCaptcha iframe to be available
            const captchaFrame = await page.waitForSelector('iframe[title*="hCaptcha"]', { timeout: 10000 });
            // cursor.actions.move(captchaFrame);
            if (!captchaFrame) {
                throw new Error('hCaptcha iframe not found');
            }

            this.logger.log('✅ hCaptcha iframe found, starting resolution...');

            // Switch to the captcha frame
            const frame = await captchaFrame.contentFrame();

            if (!frame) {
                throw new Error('Could not access hCaptcha iframe content');
            }

            // Wait for the checkbox to be available
            await frame.waitForSelector('.checkbox', { timeout: 10000 });

            // Click the checkbox using ghost cursor
            const checkbox = await frame.$('.checkbox');
            if (checkbox) {
                // Try different cursor API approaches
                try {
                    await (cursor as any).click(checkbox);
                } catch (error) {
                    // Fallback to regular click if ghost cursor fails
                    await checkbox.click();
                }
                this.logger.log('✅ Captcha checkbox clicked');
            } else {
                throw new Error('Captcha checkbox not found');
            }

            // Wait for potential challenge to appear
            await page.waitForTimeout(3000);

            // Check if a challenge appeared
            const challengeFrame = await page.$('iframe[src*="hcaptcha.html#frame=challenge"]');

            if (challengeFrame) {
                this.logger.log('🧩 Challenge detected, attempting to solve...');
                await this.solveCaptchaChallenge(page, cursor);
            } else {
                this.logger.log('✅ No challenge appeared, captcha might be solved automatically');
            }

            // Wait a bit more to ensure captcha is processed
            await page.waitForTimeout(2000);

            this.logger.log('✅ Captcha resolution completed');

        } catch (error) {
            this.logger.error('❌ Error resolving captcha:', error);
            throw error;
        }
    }

    /**
     * Solves hCaptcha challenge if it appears
     */
    private async solveCaptchaChallenge(page: any, cursor: any): Promise<void> {
        this.logger.log('🧩 Attempting to solve captcha challenge...');

        try {
            // Wait for challenge frame
            const challengeFrame = await page.waitForSelector('iframe[src*="hcaptcha.html#frame=challenge"]', { timeout: 5000 });

            if (!challengeFrame) {
                this.logger.log('✅ No challenge frame found, captcha might already be solved');
                return;
            }

            const frame = await challengeFrame.contentFrame();
            if (!frame) {
                throw new Error('Could not access challenge frame');
            }

            // Wait for the challenge content to load
            await frame.waitForTimeout(2000);

            // Try to find and click the "Verify" button
            const verifyButton = await frame.$('.verify-button');
            if (verifyButton) {
                try {
                    await (cursor as any).click(verifyButton);
                } catch (error) {
                    // Fallback to regular click if ghost cursor fails
                    await verifyButton.click();
                }
                this.logger.log('✅ Verify button clicked');
            } else {
                this.logger.log('⚠️ Verify button not found, challenge might be different type');
            }

            // Wait for challenge completion
            await page.waitForTimeout(3000);

            this.logger.log('✅ Challenge resolution attempted');

        } catch (error) {
            this.logger.error('❌ Error solving captcha challenge:', error);
            // Don't throw here, as the challenge might not always appear
            this.logger.log('⚠️ Continuing despite challenge resolution error');
        }
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

        // Visible START banner with runId and timestamp
        const runId = `${taskType.replace(/\s+/g, '_')}-${plan.serverCode}-${Date.now()}`;
        const startTs = Date.now();
        this.logger.warn('══════════════════════════════════════════════════════════════════════════════');
        this.logger.warn(`🟩 START | ${taskType} | ${plan.serverCode} (${plan.serverName}) | runId=${runId}`);
        this.logger.warn(`⏱️ Started at: ${new Date(startTs).toLocaleString()}`);
        this.logger.warn('══════════════════════════════════════════════════════════════════════════════');

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
                    await this.updateNextMiniAttackTime(plan);
                    break;
                case 'Player Village Attacks':
                    await this.executePlayerVillageAttacksTask(serverId);
                    await this.updateNextPlayerVillageAttackTime(plan);
                    break;
                case 'Army Training':
                    await this.executeArmyTrainingTask(serverId);
                    await this.updateNextArmyTrainingTime(plan);
                    break;
                default:
                    this.logger.error(`❌ Unknown task type: ${taskType}`);
            }

            // Mark as successful
            plan.lastSuccessfulExecution = new Date();

            const durationMs = Date.now() - startTs;
            this.logger.warn('══════════════════════════════════════════════════════════════════════════════');
            this.logger.warn(`🟦 END   | ${taskType} | ${plan.serverCode} | runId=${runId}`);
            this.logger.warn(`✅ Status: success | ⌛ Duration: ${Math.round(durationMs / 1000)}s (${durationMs}ms)`);
            this.logger.warn(`🕒 Ended at: ${new Date().toLocaleString()}`);
            this.logger.warn('══════════════════════════════════════════════════════════════════════════════');

            this.logger.log(`✅ ${taskType} completed successfully for server ${plan.serverCode}`);

        } catch (error) {
            const durationMs = Date.now() - startTs;
            this.logger.warn('══════════════════════════════════════════════════════════════════════════════');
            this.logger.warn(`🟥 END   | ${taskType} | ${plan.serverCode} | runId=${runId}`);
            this.logger.warn(`❌ Status: error   | ⌛ Duration: ${Math.round(durationMs / 1000)}s (${durationMs}ms)`);
            this.logger.warn(`🕒 Ended at: ${new Date().toLocaleString()}`);
            this.logger.warn('══════════════════════════════════════════════════════════════════════════════');

            this.logger.error(`❌ Error executing ${taskType} for server ${plan.serverCode}:`, error);

            // Update next execution time for the failed task to prevent immediate retry
            this.updateNextExecutionTimeForFailedTask(plan, taskType);
        }

        // Schedule next execution
        this.scheduleNextExecution();
    }

    /**
     * Updates next execution time for a failed task to prevent immediate retry
     */
    private updateNextExecutionTimeForFailedTask(plan: ServerCrawlerPlan, taskType: string): void {
        const retryDelay = 5 * 60 * 1000; // 5 minutes

        switch (taskType) {
            case 'Construction Queue':
                plan.constructionQueue.nextExecutionTime = new Date(Date.now() + retryDelay);
                break;
            case 'Scavenging':
                plan.scavenging.nextExecutionTime = new Date(Date.now() + retryDelay);
                break;
            case 'Mini Attacks':
                plan.miniAttacks.nextExecutionTime = new Date(Date.now() + retryDelay);
                break;
            case 'Player Village Attacks':
                plan.playerVillageAttacks.nextExecutionTime = new Date(Date.now() + retryDelay);
                break;
            case 'Army Training':
                plan.armyTraining.nextExecutionTime = new Date(Date.now() + retryDelay);
                break;
        }

        this.logger.log(`⏰ Updated next execution time for failed ${taskType} on server ${plan.serverCode} to ${new Date(Date.now() + retryDelay).toLocaleString()}`);
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
        this.logger.log(`🚀 Executing scavenging for server ${serverId}`);
        await this.crawlerService.performScavenging(serverId);
    }

    /**
     * Executes mini attacks on barbarian villages for a server
     */
    private async executeMiniAttacksTask(serverId: number): Promise<void> {
        this.logger.log(`🚀 Executing mini attacks for server ${serverId}`);

        const browserPage = await createBrowserPage({ headless: true });
        const browser = browserPage.browser;
        const { page } = browserPage;
        try {
            // Get only active strategies for this server
            const strategies = await this.miniAttackStrategiesService.findActiveByServer(serverId);
            if (strategies.length === 0) {
                this.logger.warn(`⚠️ No active mini attack strategies found for server ${serverId}`);
                return;
            }

            this.logger.log(`📋 Found ${strategies.length} active strategies for server ${serverId}`);

            const serverName = await this.serversService.getServerName(serverId);
            const serverCode = await this.serversService.getServerCode(serverId);

            // 1. Login and select world
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed for server ${serverId}: ${loginResult.error || 'Unknown error'}`);
            }

            this.logger.log(`Successfully logged in for server ${serverId}, starting mini attacks...`);

            // Execute mini attacks for each strategy (village)
            for (const strategy of strategies) {

                this.logger.log(`🗡️ Executing mini attacks for village ${strategy.villageId} on server ${serverId}`);

                try {
                    await this.barbarianVillagesService.executeMiniAttacks(serverId, strategy.villageId, page, serverCode, strategy);
                    this.logger.log(`✅ Mini attacks completed for village ${strategy.villageId} on server ${serverId}`);
                } catch (villageError) {
                    this.logger.error(`❌ Error executing mini attacks for village ${strategy.villageId} on server ${serverId}:`, villageError);
                    // Continue with next village instead of stopping
                }
            }

            this.logger.log(`🎯 All mini attacks completed for server ${serverId}`);

        } catch (error) {
            this.logger.error(`❌ Error during mini attacks execution for server ${serverId}:`, error);
            // Check for bot protection quest element after error
            await this.checkBotProtection(serverId, page);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
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
        this.logger.log(`🚀 Executing army training for server ${serverId}`);

        try {
            // Get active army training strategies for this server
            const strategies = await this.armyTrainingStrategiesService.findActiveByServer(serverId);
            if (strategies.length === 0) {
                this.logger.warn(`⚠️ No active army training strategies found for server ${serverId}`);
                return;
            }

            this.logger.log(`📋 Found ${strategies.length} active army training strategies for server ${serverId}`);

            // Execute army training for each strategy (village)
            for (const strategy of strategies) {
                this.logger.log(`⚔️ Starting army training for village ${strategy.villageId} on server ${serverId}`);

                try {
                    await this.armyTrainingService.startTrainingUnits(strategy, serverId);
                    this.logger.log(`✅ Army training completed for village ${strategy.villageId} on server ${serverId}`);
                } catch (villageError) {
                    this.logger.error(`❌ Error executing army training for village ${strategy.villageId} on server ${serverId}:`, villageError);
                    // Continue with next village instead of stopping
                }
            }

            this.logger.log(`🎯 All army training completed for server ${serverId}`);

        } catch (error) {
            this.logger.error(`❌ Error during army training execution for server ${serverId}:`, error);
            throw error;
        }
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
    private async updateNextMiniAttackTime(plan: ServerCrawlerPlan): Promise<void> {
        const delay = await this.getRandomMiniAttackInterval(plan.serverId);
        plan.miniAttacks.nextExecutionTime = new Date(Date.now() + delay);
        plan.miniAttacks.lastExecuted = new Date();
        plan.miniAttacks.lastAttackTime = new Date();

        const delayMinutes = Math.round(delay / 1000 / 60);
        this.logger.debug(`📅 Next mini attack for ${plan.serverCode}: ${plan.miniAttacks.nextExecutionTime.toLocaleString()} (in ${delayMinutes} minutes)`);
    }

    /**
     * Executes player village attacks for a server
     */
    private async executePlayerVillageAttacksTask(serverId: number): Promise<void> {
        this.logger.log(`🚀 Executing player village attacks for server ${serverId}`);

        try {
            // Use the PlayerVillagesService.executeAttacks method
            await this.playerVillagesService.executeAttacks(serverId);
            this.logger.log(`✅ Player village attacks completed successfully for server ${serverId}`);
        } catch (error) {
            this.logger.error(`❌ Error executing player village attacks for server ${serverId}:`, error);
            throw error;
        }
    }

    /**
     * Updates next player village attacks execution time
     */
    private async updateNextPlayerVillageAttackTime(plan: ServerCrawlerPlan): Promise<void> {
        const delay = await this.getRandomMiniAttackInterval(plan.serverId); // Use same delay as mini attacks
        plan.playerVillageAttacks.nextExecutionTime = new Date(Date.now() + delay);
        plan.playerVillageAttacks.lastExecuted = new Date();
        plan.playerVillageAttacks.lastAttackTime = new Date();

        const delayMinutes = Math.round(delay / 1000 / 60);
        this.logger.debug(`📅 Next player village attack for ${plan.serverCode}: ${plan.playerVillageAttacks.nextExecutionTime.toLocaleString()} (in ${delayMinutes} minutes)`);
    }

    /**
     * Updates next army training execution time
     */
    private async updateNextArmyTrainingTime(plan: ServerCrawlerPlan): Promise<void> {
        const delay = await this.getRandomArmyTrainingInterval(plan.serverId);
        plan.armyTraining.nextExecutionTime = new Date(Date.now() + delay);
        plan.armyTraining.lastExecuted = new Date();

        const delayMinutes = Math.round(delay / 1000 / 60);
        this.logger.debug(`📅 Next army training for ${plan.serverCode}: ${plan.armyTraining.nextExecutionTime.toLocaleString()} (in ${delayMinutes} minutes)`);
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
     * Generates random interval for construction queue processing
     */
    private getRandomConstructionInterval(): number {
        return Math.floor(Math.random() * (this.MAX_CONSTRUCTION_INTERVAL - this.MIN_CONSTRUCTION_INTERVAL + 1)) + this.MIN_CONSTRUCTION_INTERVAL;
    }

    /**
     * Generates random interval for mini attacks based on database settings
     */
    private async getRandomMiniAttackInterval(serverId: number): Promise<number> {
        try {
            const minInterval = await this.getMiniAttackMinInterval(serverId);
            const maxInterval = await this.getMiniAttackMaxInterval(serverId);

            return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
        } catch (error) {
            this.logger.error(`Error getting mini attack interval for server ${serverId}:`, error);
            // Fallback to default values
            return Math.floor(Math.random() * (this.MAX_MINI_ATTACK_INTERVAL - this.MIN_MINI_ATTACK_INTERVAL + 1)) + this.MIN_MINI_ATTACK_INTERVAL;
        }
    }

    /**
     * Generates random interval for army training based on settings
     */
    private async getRandomArmyTrainingInterval(serverId: number): Promise<number> {
        try {
            const minIntervalSetting = await this.settingsService.getSetting<{ value: number }>(serverId, SettingsKey.ARMY_TRAINING_MIN_INTERVAL);
            const maxIntervalSetting = await this.settingsService.getSetting<{ value: number }>(serverId, SettingsKey.ARMY_TRAINING_MAX_INTERVAL);

            const minInterval = minIntervalSetting?.value || this.DEFAULT_MIN_ARMY_TRAINING_INTERVAL;
            const maxInterval = maxIntervalSetting?.value || this.DEFAULT_MAX_ARMY_TRAINING_INTERVAL;

            return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
        } catch (error) {
            this.logger.error(`Failed to get army training interval settings for server ${serverId}:`, error);
            return Math.floor(Math.random() * (this.DEFAULT_MAX_ARMY_TRAINING_INTERVAL - this.DEFAULT_MIN_ARMY_TRAINING_INTERVAL + 1)) + this.DEFAULT_MIN_ARMY_TRAINING_INTERVAL;
        }
    }

    /**
     * Gets minimum mini attack interval from settings
     */
    private async getMiniAttackMinInterval(serverId: number): Promise<number> {
        try {
            const setting = await this.settingsService.getSetting<{ value: number }>(serverId, SettingsKey.MINI_ATTACKS_MIN_INTERVAL);
            // Convert minutes to milliseconds
            const minutes = setting?.value || 10; // Default 10 minutes
            return minutes * 60 * 1000;
        } catch (error) {
            this.logger.error(`Failed to get mini attack min interval for server ${serverId}:`, error);
            return this.MIN_MINI_ATTACK_INTERVAL;
        }
    }

    /**
     * Gets maximum mini attack interval from settings
     */
    private async getMiniAttackMaxInterval(serverId: number): Promise<number> {
        try {
            const setting = await this.settingsService.getSetting<{ value: number }>(serverId, SettingsKey.MINI_ATTACKS_MAX_INTERVAL);
            // Convert minutes to milliseconds
            const minutes = setting?.value || 15; // Default 15 minutes
            return minutes * 60 * 1000;
        } catch (error) {
            this.logger.error(`Failed to get mini attack max interval for server ${serverId}:`, error);
            return this.MAX_MINI_ATTACK_INTERVAL;
        }
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
     * Generates initial 10 seconds interval for player village attacks
     */
    private getInitialPlayerVillageAttackInterval(): number {
        return 5000;
    }

    /**
     * Generates initial 30 seconds interval for army training
     */
    private getInitialArmyTrainingInterval(): number {
        return 3000;
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
            const isEnabled = setting?.value === true;

            if (!isEnabled) {
                this.logger.warn(`⚠️ Scavenging is disabled for server ${serverId}. Skipping execution.`);
            }

            return isEnabled;
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
     * Checks if army training is enabled for a server
     */
    private async isArmyTrainingEnabled(serverId: number): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(serverId, SettingsKey.AUTO_ARMY_TRAINING_LIGHT_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error(`Failed to check army training setting for server ${serverId}:`, error);
            return false;
        }
    }

    /**
     * Checks if player village attacks are enabled for a server
     */
    private async isPlayerVillageAttacksEnabled(serverId: number): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(serverId, SettingsKey.PLAYER_VILLAGE_ATTACKS_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error(`Failed to check player village attacks setting for server ${serverId}:`, error);
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
        // add yellow color to all text in the method
        this.logger.warn('📋 ============== DETAILED TASK SCHEDULE ==============');

        if (this.multiServerState.activeServers.length === 0) {
            this.logger.log('⚠️ No active servers found');
            return;
        }

        const now = new Date();
        const allTasks: Array<{
            serverCode: string;
            serverName: string;
            taskType: string;
            enabled: boolean;
            nextExecution: Date;
            timeUntilExecution: number;
            lastExecuted: Date | null;
        }> = [];

        // Collect all tasks from all servers
        for (const [serverId, plan] of this.multiServerState.serverPlans) {
            allTasks.push(
                {
                    serverCode: plan.serverCode,
                    serverName: plan.serverName,
                    taskType: 'Construction Queue',
                    enabled: plan.constructionQueue.enabled,
                    nextExecution: plan.constructionQueue.nextExecutionTime,
                    timeUntilExecution: plan.constructionQueue.nextExecutionTime.getTime() - now.getTime(),
                    lastExecuted: plan.constructionQueue.lastExecuted
                },
                {
                    serverCode: plan.serverCode,
                    serverName: plan.serverName,
                    taskType: 'Scavenging',
                    enabled: plan.scavenging.enabled,
                    nextExecution: plan.scavenging.nextExecutionTime,
                    timeUntilExecution: plan.scavenging.nextExecutionTime.getTime() - now.getTime(),
                    lastExecuted: plan.scavenging.lastExecuted
                },
                {
                    serverCode: plan.serverCode,
                    serverName: plan.serverName,
                    taskType: 'Mini Attacks',
                    enabled: plan.miniAttacks.enabled,
                    nextExecution: plan.miniAttacks.nextExecutionTime,
                    timeUntilExecution: plan.miniAttacks.nextExecutionTime.getTime() - now.getTime(),
                    lastExecuted: plan.miniAttacks.lastExecuted
                },
                {
                    serverCode: plan.serverCode,
                    serverName: plan.serverName,
                    taskType: 'Player Village Attacks',
                    enabled: plan.playerVillageAttacks.enabled,
                    nextExecution: plan.playerVillageAttacks.nextExecutionTime,
                    timeUntilExecution: plan.playerVillageAttacks.nextExecutionTime.getTime() - now.getTime(),
                    lastExecuted: plan.playerVillageAttacks.lastExecuted
                },
                {
                    serverCode: plan.serverCode,
                    serverName: plan.serverName,
                    taskType: 'Army Training',
                    enabled: plan.armyTraining.enabled,
                    nextExecution: plan.armyTraining.nextExecutionTime,
                    timeUntilExecution: plan.armyTraining.nextExecutionTime.getTime() - now.getTime(),
                    lastExecuted: plan.armyTraining.lastExecuted
                }
            );
        }

        // Sort tasks by execution time
        allTasks.sort((a, b) => a.timeUntilExecution - b.timeUntilExecution);

        // Log enabled tasks first
        const enabledTasks = allTasks.filter(task => task.enabled);
        if (enabledTasks.length > 0) {
            this.logger.log('🟢 ENABLED TASKS (sorted by execution time):');
            enabledTasks.forEach((task, index) => {
                const timeUntil = Math.max(0, task.timeUntilExecution);
                const minutes = Math.floor(timeUntil / 1000 / 60);
                const seconds = Math.floor((timeUntil / 1000) % 60);
                const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                const lastExecutedStr = task.lastExecuted
                    ? `(last: ${task.lastExecuted.toLocaleTimeString()})`
                    : '(never executed)';

                this.logger.log(`  ${index + 1}. ${task.taskType} - ${task.serverCode} (${task.serverName})`);
                this.logger.log(`     ⏰ Next execution: ${task.nextExecution.toLocaleString()} (in ${timeString})`);
                this.logger.log(`     📅 ${lastExecutedStr}`);
            });
        } else {
            this.logger.error('🔴 No enabled tasks found');
        }

        // Log disabled tasks
        const disabledTasks = allTasks.filter(task => !task.enabled);
        if (disabledTasks.length > 0) {
            this.logger.log('⚪ DISABLED TASKS:');
            disabledTasks.forEach(task => {
                this.logger.log(`  - ${task.taskType} - ${task.serverCode} (${task.serverName})`);
            });
        }



        // Log next scheduled task
        const nextTask = this.findNextTaskToExecute();
        if (nextTask) {
            const plan = this.multiServerState.serverPlans.get(nextTask.serverId)!;
            const timeUntil = Math.max(0, nextTask.task.nextExecutionTime.getTime() - now.getTime());
            const minutes = Math.floor(timeUntil / 1000 / 60);
            const seconds = Math.floor((timeUntil / 1000) % 60);
            const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

            this.logger.log('🎯 NEXT SCHEDULED TASK:');
            this.logger.log(`  ${nextTask.taskType} - ${plan.serverCode} (${plan.serverName})`);
            this.logger.log(`  ⏰ Execution time: ${nextTask.task.nextExecutionTime.toLocaleString()} (in ${timeString})`);
        }

        this.logger.warn('📋 ============== END TASK SCHEDULE ==============');
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
                },
                playerVillageAttacks: {
                    enabled: plan.playerVillageAttacks.enabled,
                    nextExecution: plan.playerVillageAttacks.nextExecutionTime,
                    lastExecuted: plan.playerVillageAttacks.lastExecuted,
                    lastAttackTime: plan.playerVillageAttacks.lastAttackTime
                },
                armyTraining: {
                    enabled: plan.armyTraining.enabled,
                    nextExecution: plan.armyTraining.nextExecutionTime,
                    lastExecuted: plan.armyTraining.lastExecuted,
                    villageId: plan.armyTraining.villageId
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