import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { CrawlerService } from './crawler.service';
import { VillageConstructionQueueService } from '@/village-construction-queue/village-construction-queue.service';
import { AuthUtils } from './utils/auth.utils';
import { PlemionaCredentials } from './utils/auth.interfaces';
import { createBrowserPage } from '@/utils/browser.utils';
import { ScavengingTimeData } from './utils/scavenging.interfaces';
import { ScavengingUtils } from './utils/scavenging.utils';
import { VillageUtils } from '@/crawler/utils/village.utils';
import { ArmyUtils } from './utils/army.utils';
import { AttackUtils, AttackResult } from './utils/attack.utils';

interface CrawlerTask {
    nextExecutionTime: Date;
    enabled: boolean;
    lastExecuted: Date | null;
    name: string;
}

interface CrawlerPlan {
    constructionQueue: CrawlerTask;
    scavenging: CrawlerTask & {
        optimalDelay: number | null;
    };
    miniAttacks: CrawlerTask & {
        nextTargetIndex: number;
        lastAttackTime: Date | null;
    };
}

@Injectable()
export class CrawlerOrchestratorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CrawlerOrchestratorService.name);
    private readonly credentials: PlemionaCredentials;

    // Centralized task management
    private crawlerPlan: CrawlerPlan;
    private mainTimer: NodeJS.Timeout | null = null;
    private monitoringTimer: NodeJS.Timeout | null = null;

    // Configuration constants
    private readonly MIN_CONSTRUCTION_INTERVAL = 1000 * 60 * 5; // 5 minutes
    private readonly MAX_CONSTRUCTION_INTERVAL = 1000 * 60 * 8; // 8 minutes
    private readonly BATCH_EXECUTION_DELAY = 10000; // 10 seconds between tasks in batch
    private readonly PROXIMITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
    private readonly MONITORING_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds

    // Mini attacks configuration
    private readonly MIN_MINI_ATTACK_INTERVAL = 1000 * 60 * 15; // 15 minutes
    private readonly MAX_MINI_ATTACK_INTERVAL = 1000 * 60 * 20; // 20 minutes

    // Configuration constants for village information
    private readonly WORLD_NUMBER = '216';
    private readonly VILLAGE_ID = '2197';

    constructor(
        private readonly settingsService: SettingsService,
        private readonly configService: ConfigService,
        private readonly crawlerService: CrawlerService,
        private readonly constructionQueueService: VillageConstructionQueueService
    ) {
        // Initialize credentials from environment variables
        this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);
        this.validateCredentials();

        // Initialize crawler plan
        this.initializeCrawlerPlan();

        //collectVillageInformation
    }

    async onModuleInit() {
        this.logger.log('CrawlerOrchestratorService initialized');
        // this.initializeBarbarianAttacks();

        // this.startMonitoring();
    }

    async onModuleDestroy() {
        this.stopOrchestrator();
    }

    private async initializeBarbarianAttacks() {
        const { browser, context, page } = await createBrowserPage({ headless: true });

        try {
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.settingsService
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            }

            // Get army data using ArmyUtils
            await ArmyUtils.getArmyData(page, this.VILLAGE_ID, this.WORLD_NUMBER);

        } catch (error) {
            this.logger.error('Error during barbarian attacks initialization:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
 * Validates the credentials
 */
    private async validateCredentials() {
        const validation = AuthUtils.validateCredentials(this.credentials);
        if (!validation.isValid) {
            this.logger.warn(`Invalid credentials: missing fields: ${validation.missingFields.join(', ')}, errors: ${validation.errors.join(', ')}. Fallback to cookies will be attempted.`);
        } else {
            this.logger.log('Plemiona credentials loaded from environment variables successfully.');
        }
    }

    /**
     * Initializes the crawler plan with default values
     */
    private initializeCrawlerPlan(): void {
        const now = new Date();
        const constructionDelay = this.getRandomConstructionInterval();
        const miniAttackDelay = 5000; // Start scavenging in 10 seconds

        this.crawlerPlan = {
            constructionQueue: {
                nextExecutionTime: new Date(now.getTime() + 31000),//constructionDelay
                enabled: false,
                lastExecuted: null,
                name: 'Construction Queue'
            },
            scavenging: {
                nextExecutionTime: new Date(now.getTime() + 30000), // Start scavenging in 30 seconds
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
            }
        };

        this.logger.log('Crawler plan initialized');
        this.logCrawlerPlan();
    }

    /**
     * Starts monitoring and checks orchestrator status periodically
     */
    private async startMonitoring(): Promise<void> {
        this.logger.log('Starting orchestrator monitoring...');

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
        const orchestratorEnabled = await this.isOrchestratorEnabled();

        if (orchestratorEnabled) {
            if (!this.mainTimer) {
                this.logger.log('🟢 Orchestrator enabled - starting scheduler...');
                await this.updateTaskStates();
                this.scheduleNextExecution();
            }
        } else {
            if (this.mainTimer) {
                this.logger.log('🔴 Orchestrator disabled - stopping scheduler...');
                this.stopScheduler();
            } else {
                this.logger.debug('⚪ Orchestrator disabled - monitoring...');
            }
        }
    }

    /**
     * Updates task enabled states from settings
     */
    private async updateTaskStates(): Promise<void> {
        this.crawlerPlan.constructionQueue.enabled = await this.isConstructionQueueEnabled();
        this.crawlerPlan.scavenging.enabled = await this.isScavengingEnabled();
        this.crawlerPlan.miniAttacks.enabled = await this.isMiniAttacksEnabled();

        this.logger.warn(`Task states updated: Construction=${this.crawlerPlan.constructionQueue.enabled}, Scavenging=${this.crawlerPlan.scavenging.enabled}, MiniAttacks=${this.crawlerPlan.miniAttacks.enabled}`);

        // Log updated plan state
        this.logCrawlerPlan();
    }

    /**
     * Main scheduler that determines which task to execute next
     */
    private scheduleNextExecution(): void {
        if (this.mainTimer) {
            clearTimeout(this.mainTimer);
            this.mainTimer = null;
        }

        const now = new Date();

        // Debug: Check all tasks before filtering
        this.logger.debug(`🔍 Pre-filter task states:`);
        this.logger.debug(`  Construction: enabled=${this.crawlerPlan.constructionQueue.enabled}, next=${this.crawlerPlan.constructionQueue.nextExecutionTime.toLocaleString()}`);
        this.logger.debug(`  Scavenging: enabled=${this.crawlerPlan.scavenging.enabled}, next=${this.crawlerPlan.scavenging.nextExecutionTime.toLocaleString()}`);
        this.logger.debug(`  MiniAttacks: enabled=${this.crawlerPlan.miniAttacks.enabled}, next=${this.crawlerPlan.miniAttacks.nextExecutionTime.toLocaleString()}`);

        const tasks = [this.crawlerPlan.constructionQueue, this.crawlerPlan.scavenging, this.crawlerPlan.miniAttacks]
            .filter(task => task.enabled)
            .sort((a, b) => a.nextExecutionTime.getTime() - b.nextExecutionTime.getTime());

        this.logger.debug(`🎯 Post-filter enabled tasks: ${tasks.map(t => t.name).join(', ')} (${tasks.length} total)`);

        if (tasks.length === 0) {
            this.logger.log('⚪ No enabled tasks - checking again in 1 minute...');
            this.mainTimer = setTimeout(() => {
                this.scheduleNextExecution();
            }, 60000);
            return;
        }

        const nextTask = tasks[0];
        const delay = Math.max(0, nextTask.nextExecutionTime.getTime() - now.getTime());

        // Check if we have multiple tasks close together (batch execution)
        const closeTasks = tasks.filter(task =>
            task.nextExecutionTime.getTime() - nextTask.nextExecutionTime.getTime() <= this.PROXIMITY_THRESHOLD
        );

        if (closeTasks.length > 1) {
            this.logger.log(`📦 Batch execution scheduled: ${closeTasks.map(t => t.name).join(', ')} in ${Math.round(delay / 1000)}s`);
            this.mainTimer = setTimeout(async () => {
                await this.executeBatchTasks(closeTasks);
            }, delay);
        } else {
            this.logger.log(`⏰ Next task: ${nextTask.name} in ${Math.round(delay / 1000)}s (${nextTask.nextExecutionTime.toLocaleString()})`);
            this.mainTimer = setTimeout(async () => {
                await this.executeSingleTask(nextTask);
            }, delay);
        }
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
        this.logger.log('Stopping crawler orchestrator...');

        this.stopScheduler();

        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        this.logger.log('Crawler orchestrator stopped');
    }

    /**
 * Executes multiple tasks in batch mode (when they are scheduled close together)
 */
    private async executeBatchTasks(tasks: CrawlerTask[]): Promise<void> {
        this.logger.log(`📦 Starting batch execution: ${tasks.map(t => t.name).join(', ')}`);

        // Sort tasks - scavenging first, then construction, then mini attacks
        const sortedTasks = [...tasks].sort((a, b) => {
            if (a.name.includes('Scavenging')) return -1;
            if (b.name.includes('Scavenging')) return 1;
            if (a.name.includes('Construction')) return -1;
            if (b.name.includes('Construction')) return 1;
            return 0;
        });

        for (let i = 0; i < sortedTasks.length; i++) {
            const task = sortedTasks[i];
            this.logger.debug(`🔄 Batch task ${i + 1}/${sortedTasks.length}: ${task.name}`);

            if (i > 0) {
                this.logger.log(`⏳ Waiting ${this.BATCH_EXECUTION_DELAY / 1000}s before next task...`);
                await new Promise(resolve => setTimeout(resolve, this.BATCH_EXECUTION_DELAY));
            }

            await this.executeSingleTask(task, true);
            this.logger.debug(`✅ Completed batch task ${i + 1}/${sortedTasks.length}: ${task.name}`);
        }

        this.logger.log('📦 Batch execution completed');
        this.logger.debug('🔄 Scheduling next execution after batch...');
        this.scheduleNextExecution();
    }

    /**
     * Executes a single task
     */
    private async executeSingleTask(task: CrawlerTask, inBatchMode: boolean = false): Promise<void> {
        this.logger.log(`🚀 Executing task: ${task.name}`);

        try {
            if (task.name.includes('Construction')) {
                await this.executeConstructionQueueTask();
                this.updateNextConstructionTime();
            } else if (task.name.includes('Scavenging')) {
                await this.executeScavengingTask();
                await this.updateNextScavengingTime();
            } else if (task.name.includes('Mini Attacks')) {
                await this.executeMiniAttacksTask();
                this.updateNextMiniAttackTime();
            }

            task.lastExecuted = new Date();
            this.logger.log(`✅ Task completed: ${task.name}`);

        } catch (error) {
            this.logger.error(`❌ Error executing task ${task.name}:`, error);
            // Continue with scheduling even if task fails
        }

        if (!inBatchMode) {
            this.scheduleNextExecution();
        }
    }

    /**
     * Executes construction queue processing
     */
    private async executeConstructionQueueTask(): Promise<void> {
        await this.constructionQueueService.processAndCheckConstructionQueue();
    }

    /**
     * Executes scavenging processing
     */
    private async executeScavengingTask(): Promise<void> {
        const { browser, context, page } = await createBrowserPage({ headless: true });

        try {
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.settingsService
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            }

            await this.crawlerService.performScavenging(page);

        } finally {
            await browser.close();
        }
    }

    /**
     * Executes mini attacks on barbarian villages
     */
    private async executeMiniAttacksTask(): Promise<void> {
        this.logger.log('🗡️ Starting mini attacks task...');

        const { browser, context, page } = await createBrowserPage({ headless: true });

        try {
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.settingsService
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            }

            // 1. Loading barbarian villages from JSON
            this.logger.log('📋 Loading barbarian villages...');
            const barbarianVillages = await AttackUtils.loadBarbarianVillages();
            
            if (barbarianVillages.length === 0) {
                this.logger.warn('No barbarian villages found in JSON file');
                return;
            }

            // 2. Get current target index from settings (persistent storage)
            let currentTargetIndex = await this.getNextTargetIndex();
            this.logger.log(`📍 Current target index: ${currentTargetIndex} (village: ${barbarianVillages[currentTargetIndex % barbarianVillages.length]?.name || 'unknown'})`);

            // 3. Checking army availability using ArmyUtils
            this.logger.log('⚔️ Checking army availability...');
            const armyData = await ArmyUtils.getArmyData(page, this.VILLAGE_ID, this.WORLD_NUMBER);
            
            // Check if we have enough troops for any attacks
            if (!AttackUtils.hasEnoughTroopsForAttack(armyData)) {
                this.logger.warn('❌ Insufficient troops for mini attacks. Need at least 2 spear + 2 sword units.');
                this.logger.log('🗡️ Mini attacks task completed - no attacks possible');
                return;
            }

            // Calculate how many attacks we can perform
            const attackCalculation = AttackUtils.calculateAvailableAttacks(armyData);
            this.logger.log(`📊 Can perform ${attackCalculation.maxAttacks} attacks with available troops`);

            // 4. Performing attacks
            const attackResults: AttackResult[] = [];
            const startingIndex = currentTargetIndex;
            let attacksPerformed = 0;

            this.logger.log(`🎯 Starting attack sequence from target index ${currentTargetIndex}...`);

            for (let i = 0; i < attackCalculation.maxAttacks && i < barbarianVillages.length; i++) {
                // 2. Selecting target based on nextTargetIndex
                const { village: targetVillage, nextIndex } = AttackUtils.getNextTarget(barbarianVillages, currentTargetIndex);
                
                this.logger.log(`🎯 Attack ${i + 1}/${attackCalculation.maxAttacks}: Targeting ${targetVillage.name} (${targetVillage.coordinatesString})`);

                try {
                    // 4. Performing attack
                    const attackResult = await AttackUtils.performMiniAttack(page, targetVillage, this.VILLAGE_ID);
                    attackResults.push(attackResult);

                    if (attackResult.success) {
                        attacksPerformed++;
                        this.logger.log(`✅ Attack ${i + 1} successful: ${targetVillage.name} (${targetVillage.coordinatesString})`);
                    } else {
                        this.logger.warn(`❌ Attack ${i + 1} failed: ${targetVillage.name} (${targetVillage.coordinatesString}) - ${attackResult.error}`);
                    }

                    // 5. Updating nextTargetIndex
                    currentTargetIndex = nextIndex;
                    await this.saveNextTargetIndex(currentTargetIndex);

                    // Small delay between attacks to avoid overwhelming the server
                    if (i < attackCalculation.maxAttacks - 1) {
                        this.logger.debug('⏳ Waiting 2 seconds before next attack...');
                        await page.waitForTimeout(2000);
                    }

                } catch (attackError) {
                    this.logger.error(`💥 Error during attack ${i + 1} on ${targetVillage.name}:`, attackError);
                    
                    // Still update the target index to move to next village
                    currentTargetIndex = nextIndex;
                    await this.saveNextTargetIndex(currentTargetIndex);

                    // Add failed result
                    attackResults.push({
                        success: false,
                        targetVillage,
                        error: attackError.message
                    });

                    // Continue with next village instead of stopping
                    continue;
                }
            }

            // Log summary of all attacks
            AttackUtils.logAttackSummary(attackResults, attackCalculation.maxAttacks, startingIndex, currentTargetIndex);

            // Update last attack time
            this.crawlerPlan.miniAttacks.lastAttackTime = new Date();

            this.logger.log(`🗡️ Mini attacks task completed: ${attacksPerformed}/${attackCalculation.maxAttacks} successful attacks`);

        } catch (error) {
            this.logger.error('Error during mini attacks execution:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * Updates next construction queue execution time
     */
    private updateNextConstructionTime(): void {
        const delay = this.getRandomConstructionInterval();
        this.crawlerPlan.constructionQueue.nextExecutionTime = new Date(Date.now() + delay);

        this.logger.log(`📅 Next construction queue: ${this.crawlerPlan.constructionQueue.nextExecutionTime.toLocaleString()}`);
    }

    /**
     * Updates next scavenging execution time based on optimal calculation
     */
    private async updateNextScavengingTime(): Promise<void> {
        try {
            const scavengingData = this.crawlerService.getScavengingTimeData();
            let optimalDelay = ScavengingUtils.calculateOptimalScheduleTime(scavengingData);

            if (optimalDelay === null || optimalDelay < 30) {
                optimalDelay = 300; // 5 minutes fallback
                this.logger.warn('Using fallback scavenging delay: 5 minutes');
            }

            // Add random buffer to make it less predictable
            const bufferSeconds = Math.floor(Math.random() * 60) + 30; // 30-90 seconds
            optimalDelay += bufferSeconds;

            this.crawlerPlan.scavenging.optimalDelay = optimalDelay;
            this.crawlerPlan.scavenging.nextExecutionTime = new Date(Date.now() + (optimalDelay * 1000));

            this.logger.log(`📅 Next scavenging: ${this.crawlerPlan.scavenging.nextExecutionTime.toLocaleString()} (optimal: ${optimalDelay}s)`);

        } catch (error) {
            this.logger.error('Error calculating optimal scavenging time:', error);
            // Fallback to 5 minutes
            this.crawlerPlan.scavenging.nextExecutionTime = new Date(Date.now() + 300000);
            this.logger.log(`📅 Next scavenging (fallback): ${this.crawlerPlan.scavenging.nextExecutionTime.toLocaleString()}`);
        }
    }

    /**
     * Updates next mini attacks execution time with dynamic interval
     */
    private updateNextMiniAttackTime(): void {
        const delay = this.getRandomMiniAttackInterval();
        this.crawlerPlan.miniAttacks.nextExecutionTime = new Date(Date.now() + delay);

        const delayMinutes = Math.round(delay / 1000 / 60);
        this.logger.log(`📅 Next mini attack: ${this.crawlerPlan.miniAttacks.nextExecutionTime.toLocaleString()} (in ${delayMinutes} minutes)`);
    }

    /**
     * Logs current crawler plan state
     */
    private logCrawlerPlan(): void {
        this.logger.log('📋 Current crawler plan:');
        this.logger.log(`  🏗️  Construction Queue: ${this.crawlerPlan.constructionQueue.enabled ? '✅' : '❌'} - Next: ${this.crawlerPlan.constructionQueue.nextExecutionTime.toLocaleString()}`);
        this.logger.log(`  🗡️  Scavenging: ${this.crawlerPlan.scavenging.enabled ? '✅' : '❌'} - Next: ${this.crawlerPlan.scavenging.nextExecutionTime.toLocaleString()}`);
        this.logger.log(`  ⚔️  Mini Attacks: ${this.crawlerPlan.miniAttacks.enabled ? '✅' : '❌'} - Next: ${this.crawlerPlan.miniAttacks.nextExecutionTime.toLocaleString()}`);
    }

    /**
     * Runs the scavenging process using CrawlerService
     */
    private async runScavengingProcess(page: any): Promise<void> {
        await this.crawlerService.performScavenging(page);
    }

    /**
     * Generates random interval for construction queue processing
     */
    private getRandomConstructionInterval(): number {
        return Math.floor(Math.random() * (this.MAX_CONSTRUCTION_INTERVAL - this.MIN_CONSTRUCTION_INTERVAL + 1)) + this.MIN_CONSTRUCTION_INTERVAL;
    }

    /**
     * Generates random interval for mini attacks (15-20 minutes)
     */
    private getRandomMiniAttackInterval(): number {
        return Math.floor(Math.random() * (this.MAX_MINI_ATTACK_INTERVAL - this.MIN_MINI_ATTACK_INTERVAL + 1)) + this.MIN_MINI_ATTACK_INTERVAL;
    }

    /**
     * Checks if orchestrator is enabled
     */
    private async isOrchestratorEnabled(): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(SettingsKey.CRAWLER_ORCHESTRATOR_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error('Failed to check orchestrator setting:', error);
            return false; // Default to disabled on error
        }
    }

    /**
     * Checks if scavenging is enabled
     */
    private async isScavengingEnabled(): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(SettingsKey.AUTO_SCAVENGING_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error('Failed to check scavenging setting:', error);
            return false; // Default to disabled on error
        }
    }

    /**
     * Checks if construction queue processing is enabled
     */
    private async isConstructionQueueEnabled(): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(SettingsKey.AUTO_CONSTRUCTION_QUEUE_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error('Failed to check construction queue setting:', error);
            return false; // Default to disabled on error
        }
    }

    /**
     * Checks if mini attacks are enabled
     */
    private async isMiniAttacksEnabled(): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(SettingsKey.MINI_ATTACKS_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error('Failed to check mini attacks setting:', error);
            return false; // Default to disabled on error
        }
    }

    /**
     * Public method to manually trigger scavenging
     */
    public async triggerScavenging(): Promise<void> {
        this.logger.log('Manually triggering scavenging process...');

        try {
            const { browser, context, page } = await createBrowserPage({ headless: true });

            try {
                const loginResult = await AuthUtils.loginAndSelectWorld(
                    page,
                    this.credentials,
                    this.settingsService
                );

                if (!loginResult.success || !loginResult.worldSelected) {
                    throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
                }

                await this.runScavengingProcess(page);
                this.logger.log('✅ Manual scavenging process completed successfully');

            } finally {
                await browser.close();
            }

        } catch (error) {
            this.logger.error('❌ Error during manual scavenging process:', error);
            throw error;
        }
    }

    /**
     * Public method to manually trigger construction queue processing
     */
    public async triggerConstructionQueue(): Promise<void> {
        this.logger.log('Manually triggering construction queue processing...');

        try {
            await this.constructionQueueService.processAndCheckConstructionQueue();
            this.logger.log('✅ Manual construction queue processing completed successfully');
        } catch (error) {
            this.logger.error('❌ Error during manual construction queue processing:', error);
            throw error;
        }
    }

    /**
     * Public method to manually trigger mini attacks
     */
    public async triggerMiniAttacks(): Promise<void> {
        this.logger.log('Manually triggering mini attacks...');

        try {
            await this.executeMiniAttacksTask();
            this.logger.log('✅ Manual mini attacks completed successfully');
        } catch (error) {
            this.logger.error('❌ Error during manual mini attacks:', error);
            throw error;
        }
    }

    /**
     * Gets the next target index for mini attacks from persistent storage (settings)
     * @returns Current target index (defaults to 0 if not set)
     */
    private async getNextTargetIndex(): Promise<number> {
        try {
            const setting = await this.settingsService.getSetting<{ value: number }>(SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX);
            const index = setting?.value ?? 0;
            this.logger.debug(`Retrieved next target index from settings: ${index}`);
            return index;
        } catch (error) {
            this.logger.error('Failed to get next target index from settings:', error);
            this.logger.debug('Using default target index: 0');
            return 0; // Default to first target
        }
    }

    /**
     * Saves the next target index for mini attacks to persistent storage (settings)
     * @param index Index to save
     */
    private async saveNextTargetIndex(index: number): Promise<void> {
        try {
            await this.settingsService.setSetting(SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX, { value: index });
            this.logger.debug(`Saved next target index to settings: ${index}`);
        } catch (error) {
            this.logger.error(`Failed to save next target index (${index}) to settings:`, error);
            // Don't throw error here, just log it - we don't want to stop the attack process
        }
    }
} 