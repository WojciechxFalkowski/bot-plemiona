/**
 * REFACTORED CrawlerService - Operations Pattern Orchestrator
 * 
 * This service acts as an orchestrator, delegating business logic to operations where possible.
 * Complex methods (performScavenging, processVillageScavenging) retain original implementation
 * but delegate to operations for simpler operations (validation, queries, utilities).
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createBrowserPage } from '../utils/browser.utils';
import { Page, BrowserContext, Locator } from 'playwright';
// Scavenging config imports removed - now used in operations
import { setTimeout } from 'timers/promises'; // Użycie promisowej wersji setTimeout
import { SettingsService } from '../settings/settings.service';
import { SettingsKey } from '../settings/settings-keys.enum';
import { ConfigService } from '@nestjs/config';
import { VillagesService } from '../villages/villages.service';
import { VillageResponseDto } from '../villages/dto';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { ScavengingTimeData, VillageScavengingData } from '@/utils/scavenging/scavenging.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { ScavengingLimitsService } from '@/scavenging-limits/scavenging-limits.service';
import { AdvancedScavengingService } from '@/advanced-scavenging/advanced-scavenging.service';

// Import operations
import { validateAutoScavengingEnabledOperation } from './operations/validation/validate-auto-scavenging-enabled.operation';
import { getScavengingTimeDataOperation } from './operations/query/get-scavenging-time-data.operation';
import { getVillageScavengingDataOperation } from './operations/query/get-village-scavenging-data.operation';
import { resetScavengingDataOperation } from './operations/state-management/reset-scavenging-data.operation';
import { updateVillageStateAfterDispatchOperation } from './operations/scavenging/update-village-state-after-dispatch.operation';
// Operations imports - removed unused ones
import { minutesToMillisecondsOperation } from './operations/utilities/minutes-to-milliseconds.operation';
import { processVillageScavengingOperation } from './operations/scavenging/process-village-scavenging.operation';
import { performScavengingOperation } from './operations/scavenging/perform-scavenging.operation';
import { performScavengingForVillageOperation } from './operations/scavenging/perform-scavenging-for-village.operation';
import { performAttackOperation, AttackConfig } from './operations/attacks/perform-attack.operation';
import { performSupportOperation } from './operations/attacks/perform-support.operation';

// AttackConfig is now imported from perform-attack.operation.ts

@Injectable()
export class CrawlerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CrawlerService.name);

    // Game credentials from environment variables
    private readonly credentials: PlemionaCredentials;

    // Nowa zmienna klasowa do przechowywania danych o czasach scavenging
    private scavengingTimeData: ScavengingTimeData = {
        lastCollected: new Date(),
        villages: []
    };

    // Attack configurations
    private readonly attackConfigs: AttackConfig[] = [
        // {
        // 	id: "0006",
        // 	link: "https://pl216.plemiona.pl/game.php?village=12729&screen=place&target=13728",
        // 	scheduleTime: 140 + 244 - 140, //157 08:00:00 a 06:02:29 wynosi 1 godzinę, 57 minut i 31 sekund.
        // 	marchTime: 363, // 4:01:52 -> 6 godzin, 2 minuty i 29 sekund 
        // 	type: 'attack',
        // },
        // Przykład wsparcia (możesz dodać więcej):
        // {
        // 	id: "0002",
        // 	link: "https://pl216.plemiona.pl/game.php?village=12346&screen=place&target=13728",
        // 	scheduleTime: 349+ 260- 140, //349  5 godzin, 48 minut i 48 sekund.
        // 	marchTime: 159, // Czas 2 godziny, 38 minut i 39 sekund
        // 	type: 'support',
        // },
        // {
        // 	id: "0001",
        // 	link: "https://pl216.plemiona.pl/game.php?village=12142&screen=place&target=13728",
        // 	scheduleTime: 249 + 244 - 140, //249 4 godziny, 8 minut i 44 sekundy
        // 	marchTime: 257, // Czas 4 godziny, 16 minut i 34 sekundy
        // 	type: 'support',
        // },
        // {
        // 	id: "0009",
        // 	link: "https://pl216.plemiona.pl/game.php?village=13041&screen=place&target=13728",
        // 	scheduleTime: 299 + 244 - 140, //299 4 godziny, 58 minut i 15 sekund
        // 	marchTime: 206, // Czas 3 godziny, 25 minut i 14 sekund
        // 	type: 'support',
        // },
    ];

    constructor(
        private settingsService: SettingsService,
        private plemionaCookiesService: PlemionaCookiesService,
        private villagesService: VillagesService,
        private serversService: ServersService,
        private scavengingLimitsService: ScavengingLimitsService,
        private advancedScavengingService: AdvancedScavengingService,
        private configService: ConfigService
    ) {
        // Initialize credentials from ConfigService
        this.credentials = {
            username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
        };
    }

    /**
     * Automatically starts the scavenging bot when the application initializes
     * DISABLED: Now managed by CrawlerOrchestratorService
     */
    async onModuleInit() {
        this.logger.log('CrawlerService initialized (auto-start disabled - managed by orchestrator)');
        // this.scheduleAllAttacks();
    }

    /**
     * Cleanup when module is destroyed
     */
    async onModuleDestroy() {
        this.logger.log('CrawlerService is being destroyed - cleaning up resources...');
        // Reset scavenging time data to free memory using operation
        resetScavengingDataOperation({ scavengingTimeData: this.scavengingTimeData });
        this.logger.log('CrawlerService cleanup completed');
    }

    /**
     * Schedules all attacks based on the attack configurations
     */
    private async scheduleAllAttacks(serverId: number): Promise<void> {
        this.logger.log(`Scheduling ${this.attackConfigs.length} attacks...`);

        const serverName = await this.serversService.getServerName(serverId);

        this.attackConfigs.forEach((config, index) => {
            const delayMs = this.minutesToMilliseconds(config.scheduleTime);
            const executeTime = new Date(Date.now() + delayMs);
            const arrivalTime = new Date(Date.now() + delayMs + this.minutesToMilliseconds(config.marchTime));

            // Format time for display
            const hours = Math.floor(config.scheduleTime / 60);
            const minutes = config.scheduleTime % 60;
            const timeDisplay = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

            // Format march time for display
            const marchHours = Math.floor(config.marchTime / 60);
            const marchMinutes = config.marchTime % 60;
            const marchDisplay = marchMinutes > 0 ? `${marchHours}h ${marchMinutes}m` : `${marchHours}h`;

            this.logger.log(`Attack ${index + 1}/${this.attackConfigs.length}:`);
            this.logger.log(`  Village ID: ${config.id}`);
            this.logger.log(`  Schedule: ${timeDisplay} (${executeTime.toLocaleString()})`);
            this.logger.log(`  March: ${marchDisplay} → Arrival: ${arrivalTime.toLocaleString()}`);
            this.logger.log(`  Target URL: ${config.link}`);
            this.logger.log(`  Type: ${config.type}`);

            global.setTimeout(() => {
                this.logger.log(`⚔️ Executing scheduled ${config.type} for village ${config.id}...`);
                if (config.type === 'attack') {
                    this.performAttack(config, serverName).catch(err => {
                        this.logger.error(`Error during scheduled attack for village ${config.id}:`, err);
                    });
                } else if (config.type === 'support') {
                    this.performSupport(config, serverName).catch(err => {
                        this.logger.error(`Error during scheduled support for village ${config.id}:`, err);
                    });
                }
            }, delayMs);
        });

        this.logger.log('All attacks scheduled successfully!');
    }

    /**
     * Converts minutes to milliseconds
     * Delegates to operation
     * @param minutes Time in minutes
     * @returns Time in milliseconds
     */
    private minutesToMilliseconds(minutes: number): number {
        return minutesToMillisecondsOperation(minutes);
    }

    public async startScavengingBot(serverId: number) {
        this.logger.log('Initializing Plemiona Scavenging Bot');

        // Check if auto-scavenging is enabled (default to false if not set)
        const autoScavengingEnabled = await this.isAutoScavengingEnabled(serverId);

        if (autoScavengingEnabled) {
            this.logger.log('Auto-scavenging is enabled. Starting bot in headless mode...');
            // Start the bot in headless mode
            this.runScavengingBot(serverId, { headless: true }).catch(err => {
                this.logger.error('Error starting bot on initialization:', err);
            });
        } else {
            this.logger.warn('Auto-scavenging is disabled. Bot will not start automatically.');
        }
    }

    /**
     * Checks if auto-scavenging is enabled in settings
     * Delegates to operation
     * @returns true if auto-scavenging is enabled, false otherwise
     */
    private async isAutoScavengingEnabled(serverId: number): Promise<boolean> {
        return await validateAutoScavengingEnabledOperation(serverId, {
            settingsService: this.settingsService,
            logger: this.logger
        });
    }

    /**
     * Główna metoda procesu logowania i zbieractwa.
     * @param options Opcje uruchomienia przeglądarki (np. headless).
     */
    public async runScavengingBot(serverId: number, options?: { headless?: boolean }): Promise<void> {
        this.logger.log(`Starting Plemiona Scavenging Bot for user: ${this.credentials.username}`);
        const { browser, context, page } = await createBrowserPage(options);

        try {
            // Use AuthUtils for comprehensive login and world selection
            const serverName = await this.serversService.getServerName(serverId);
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (loginResult.success && loginResult.worldSelected) {
                this.logger.log(`Login successful using method: ${loginResult.method}`);
                // --- Uruchomienie procesu zbieractwa --- 
                await this.performScavenging(serverId);
            } else {
                this.logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
                throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            }

        } catch (error) {
            this.logger.error(`Error during Plemiona bot operation`, error);
            await page.screenshot({ path: `error_screenshot_${Date.now()}.png`, fullPage: true }).catch(e => this.logger.error('Failed to take screenshot', e));
        } finally {
            // Zawsze zamykaj przeglądarkę
            if (browser) {
                await browser.close();
            }
            this.logger.log('Plemiona Scavenging Bot run finished.');
        }
    }

    /**
     * Wykonuje cykl zbieractwa: nawigacja, analiza, dystrybucja, logowanie planu i planowanie.
     * Iteruje po wszystkich wioskach i wysyła wojsko na odprawy.
     * Loguje się tylko raz na początku dla wszystkich wiosek.
     * Delegates to performScavengingOperation
     * @param serverId ID serwera
     */
    public async performScavenging(serverId: number): Promise<void> {
        return await performScavengingOperation(serverId, {
            logger: this.logger,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService,
            villagesService: this.villagesService,
            serversService: this.serversService,
            advancedScavengingService: this.advancedScavengingService,
            scavengingLimitsService: this.scavengingLimitsService,
            settingsService: this.settingsService,
            scavengingTimeData: this.scavengingTimeData
        });
    }

    /**
     * Wykonuje zbieractwo dla konkretnej wioski
     * Delegates to performScavengingForVillageOperation
     * @param serverId ID serwera
     * @param villageId ID wioski
     */
    public async performScavengingForVillage(serverId: number, villageId: string): Promise<{ success: boolean; message: string; dispatchedCount: number }> {
        return await performScavengingForVillageOperation(serverId, villageId, {
            logger: this.logger,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService,
            villagesService: this.villagesService,
            serversService: this.serversService,
            advancedScavengingService: this.advancedScavengingService,
            scavengingLimitsService: this.scavengingLimitsService,
            settingsService: this.settingsService,
            scavengingTimeData: this.scavengingTimeData
        });
    }

    /**
     * Aktualizuje stan wioski po wysłaniu wojsk na zbieractwo
     * Delegates to operation
     * @param villageId ID wioski
     * @param level Poziom zbieractwa który został uruchomiony
     * @param durationSeconds Czas trwania misji w sekundach
     */
    private updateVillageStateAfterDispatch(villageId: string, level: number, durationSeconds: number): void {
        updateVillageStateAfterDispatchOperation(villageId, level, durationSeconds, {
            scavengingTimeData: this.scavengingTimeData,
            logger: this.logger
        });
    }

    /**
     * This method is intended for scheduled execution (Cron).
     * It runs the login process in headless mode by default.
     */
    // @Cron(CronExpression.EVERY_HOUR)
    public async handleCron(serverId: number) {
        this.logger.log('Running scheduled Plemiona check (headless by default)');
        // Sprawdź czy auto-scavenging jest włączony
        const autoScavengingEnabled = await this.isAutoScavengingEnabled(serverId);

        if (autoScavengingEnabled) {
            // Wywołuje główny proces logowania i zbieractwa
            await this.runScavengingBot(serverId, { headless: true });
        } else {
            this.logger.log('Auto-scavenging is disabled. Skipping scheduled run.');
        }
    }

    /**
     * Adds a building to the construction queue for a specific village
     * @param buildingId - ID of the building to construct (e.g., "main", "barracks", "stable")
     * @param targetLevel - Target level to build the building to
     * @param villageName - Name of the village where to build
     * @returns Promise with operation result
     */
    public async addBuildingToQueue(buildingId: string, targetLevel: number, villageName: string): Promise<any> {
        this.logger.log(`Starting addBuildingToQueue: ${buildingId} level ${targetLevel} in village ${villageName}`);

        try {
            // TODO: Implement building queue functionality
            // This method will:
            // 1. Validate input parameters
            // 2. Find the village by name in stored village data
            // 3. Navigate to the specific village
            // 4. Navigate to headquarters (main building screen)
            // 5. Find the building in the interface
            // 6. Check if building requirements are met
            // 7. Check if resources are sufficient
            // 8. Add building to queue
            // 9. Return success/failure result with details

            this.logger.warn('addBuildingToQueue method not yet implemented');

            // Placeholder return - remove when implementing
            return {
                success: false,
                message: 'Method not yet implemented',
                buildingId,
                targetLevel,
                villageName
            };

        } catch (error) {
            this.logger.error(`Error in addBuildingToQueue for building ${buildingId} level ${targetLevel} in village ${villageName}:`, error);
            throw error;
        }
    }

    /**
     * Zwraca zebrane dane o czasach scavenging
     * Delegates to operation
     * @returns Aktualne dane o czasach scavenging
     */
    public getScavengingTimeData(): ScavengingTimeData {
        return getScavengingTimeDataOperation({
            scavengingTimeData: this.scavengingTimeData
        });
    }

    /**
     * Zwraca zebrane dane o czasach scavenging dla konkretnej wioski
     * Delegates to operation
     * @param villageId ID wioski
     * @returns Dane o czasach scavenging dla wioski lub null jeśli nie znaleziono
     */
    public getVillageScavengingData(villageId: string): VillageScavengingData | null {
        return getVillageScavengingDataOperation(villageId, {
            scavengingTimeData: this.scavengingTimeData
        });
    }


    /**
     * Performs an attack by logging in, navigating to attack page, selecting units and attacking
     * Delegates to performAttackOperation
     */
    public async performAttack(config: AttackConfig, serverName: string): Promise<void> {
        return await performAttackOperation(config, serverName, {
            logger: this.logger,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService
        });
    }

    /**
     * Performs a support action by logging in, navigating to support page, selecting units and sending support
     * Delegates to performSupportOperation
     */
    public async performSupport(config: AttackConfig, serverName: string): Promise<void> {
        return await performSupportOperation(config, serverName, {
            logger: this.logger,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService
        });
    }
}
