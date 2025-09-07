import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createBrowserPage } from '../utils/browser.utils';
import { Page, BrowserContext, Locator } from 'playwright';
import {
    scavengingSettings,
    unitSettings,
    unitOrder,
    levelPacks,
    availableUnitSelectors,
    unitInputNames,
    levelSelectors,
    getRandomScheduleBuffer,
    ScavengingUnit
} from '../utils/scavenging.config'; // Import konfiguracji
import { setTimeout } from 'timers/promises'; // Użycie promisowej wersji setTimeout
import { SettingsService } from '../settings/settings.service';
import { SettingsKey } from '../settings/settings-keys.enum';
import { ConfigService } from '@nestjs/config';
import { VillagesService } from '../villages/villages.service';
import { VillageResponseDto } from '../villages/dto';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';
import { VillageScavengingData } from '@/utils/scavenging/scavenging.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';

/**
 * Configuration for a scheduled attack or support
 */
interface AttackConfig {
    id: string;           // Village identifier (e.g., "0005")
    link: string;         // Attack/Support URL
    scheduleTime: number; // Time in minutes (e.g., 180 for 3 hours, 370 for 6 hours 10 minutes)
    marchTime: number;    // March time in minutes (how long troops take to reach target)
    type: 'attack' | 'support'; // Type of action: 'attack' or 'support'
}

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
        private serversService: ServersService
    ) {
    }

    /**
     * Automatically starts the scavenging bot when the application initializes
     * DISABLED: Now managed by CrawlerOrchestratorService
     */
    async onModuleInit() {
        // this.collectVillageInformation();
        //TODO uncomment this 
        // this.startScavengingBot(); // DISABLED: Now managed by CrawlerOrchestratorService
        this.logger.log('CrawlerService initialized (auto-start disabled - managed by orchestrator)');

        // Schedule all configured attacks
        // this.scheduleAllAttacks();
    }

    /**
     * Cleanup when module is destroyed
     */
    async onModuleDestroy() {
        this.logger.log('CrawlerService is being destroyed - cleaning up resources...');
        // Reset scavenging time data to free memory
        this.scavengingTimeData = {
            lastCollected: new Date(),
            villages: []
        };
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
     * @param minutes Time in minutes
     * @returns Time in milliseconds
     */
    private minutesToMilliseconds(minutes: number): number {
        return minutes * 60 * 1000;
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
     * @returns true if auto-scavenging is enabled, false otherwise
     */
    private async isAutoScavengingEnabled(serverId: number): Promise<boolean> {
        try {
            const setting = await this.settingsService.getSetting<{ value: boolean }>(serverId, SettingsKey.AUTO_SCAVENGING_ENABLED);
            return setting?.value === true;
        } catch (error) {
            this.logger.error('Failed to check auto-scavenging setting:', error);
            return false; // Default to disabled on error
        }
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
     * @param page Instancja strony Playwright.
     */
    public async performScavenging(serverId: number): Promise<void> {
        let browser: any = null;
        
        try {
            this.logger.log('Starting scavenging process for villages with auto-scavenging enabled...');

            // 1. Sprawdź czy scavenging jest włączony dla serwera
            const isScavengingEnabled = await this.isAutoScavengingEnabled(serverId);
            if (!isScavengingEnabled) {
                this.logger.warn(`⚠️ Auto-scavenging is disabled for server ${serverId}. Cannot perform scavenging.`);
                return;
            }

            // 2. Pobierz wioski z bazy danych które mają włączone auto-scavenging
            let villages: VillageResponseDto[] = [];
            try {
                const allVillages = await this.villagesService.findAll(serverId, false); // false = bez auto-refresh

                // Log all villages with their auto-scavenging status
                const enabledVillages = allVillages.filter(v => v.isAutoScavengingEnabled);
                const disabledVillages = allVillages.filter(v => !v.isAutoScavengingEnabled);

                this.logger.log(`Villages auto-scavenging status:`);
                this.logger.log(`  ✓ ENABLED (${enabledVillages.length}): ${enabledVillages.map(v => v.name).join(', ') || 'none'}`);
                this.logger.log(`  ✗ DISABLED (${disabledVillages.length}): ${disabledVillages.map(v => v.name).join(', ') || 'none'}`);

                villages = enabledVillages;

                if (!villages || villages.length === 0) {
                    this.logger.warn('No villages with auto-scavenging enabled found. Cannot perform scavenging.');
                    return;
                }
                this.logger.log(`Found ${villages.length} villages with auto-scavenging enabled to process`);
            } catch (villageError) {
                this.logger.error('Error fetching villages from database:', villageError);
                throw villageError; // Let orchestrator handle the error
            }

            // 3. Teraz dopiero otwórz przeglądarkę i zaloguj użytkownika
            const browserPage = await createBrowserPage({ headless: true });
            browser = browserPage.browser;
            const { page } = browserPage;

            try {
                const serverName = await this.serversService.getServerName(serverId);
                const serverCode = await this.serversService.getServerCode(serverId);

                this.logger.log(`🔐 Logging in to server ${serverName} (${serverCode})...`);
                const loginResult = await AuthUtils.loginAndSelectWorld(
                    page,
                    this.credentials,
                    this.plemionaCookiesService,
                    serverName
                );

                if (!loginResult.success || !loginResult.worldSelected) {
                    throw new Error(`Login failed for server ${serverCode}: ${loginResult.error || 'Unknown error'}`);
                }

                this.logger.log(`✅ Successfully logged in to server ${serverCode}`);

                // Zresetuj dane o czasach scavenging przed rozpoczęciem nowego cyklu
                this.scavengingTimeData = {
                    lastCollected: new Date(),
                    villages: []
                };

                // PRE-FILTERING: Sprawdź status scavenging dla wiosek z włączonym auto-scavenging
                this.logger.log('=== PRE-FILTERING PHASE: Collecting scavenging status for auto-scavenging enabled villages ===');
                const villagesToProcess: VillageResponseDto[] = [];

                for (let i = 0; i < villages.length; i++) {
                    const village = villages[i];
                    this.logger.log(`Pre-filtering village ${i + 1}/${villages.length}: ${village.name} (ID: ${village.id})`);

                    try {
                        // Nawigacja do zakładki Zbieractwo dla sprawdzenia statusu
                        const scavengingUrl = `https://${serverCode}.plemiona.pl/game.php?village=${village.id}&screen=place&mode=scavenge`;
                        await page.goto(scavengingUrl, { waitUntil: 'networkidle', timeout: 15000 });

                        // Zbierz dane o czasach scavenging dla tej wioski
                        const villageScavengingData = await ScavengingUtils.collectScavengingTimeData(page, village.id, village.name);
                        this.scavengingTimeData.villages.push(villageScavengingData);

                        // Wyloguj zebrane dane o czasach
                        ScavengingUtils.logScavengingTimeData(villageScavengingData);

                        // Sprawdź czy wioska ma dostępne poziomy zbieractwa
                        const levelStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);
                        const freeLevels = levelStatuses.filter(s => s.isAvailable);
                        const busyLevels = levelStatuses.filter(s => s.isBusy);

                        if (freeLevels.length > 0) {
                            // Sprawdź czy wioska ma jednostki do wysłania
                            const availableUnits = await ScavengingUtils.getAvailableUnits(page);
                            console.log("availableUnits v1");
                            console.log(availableUnits);


                            // Sprawdź tylko pikinierów (spear)
                            const spearUnitsAvailable = availableUnits['spear'] || 0;

                            if (spearUnitsAvailable > 0) {
                                this.logger.log(`✓ Village ${village.name} added to processing queue (${freeLevels.length} free levels, ${spearUnitsAvailable} spear units available)`);
                                villagesToProcess.push(village);
                            } else {
                                this.logger.log(`✗ Village ${village.name} skipped - no spear units available`);
                            }
                        } else {
                            this.logger.log(`✗ Village ${village.name} skipped - ${busyLevels.length} busy levels, no free levels`);
                        }

                        // Małe opóźnienie między wioskami
                        if (i < villages.length - 1) {
                            await page.waitForTimeout(1000);
                        }

                    } catch (villageError) {
                        this.logger.error(`Error during pre-filtering for village ${village.name}:`, villageError);
                        // Dodaj wioską z błędem do scavengingTimeData z domyślnymi wartościami
                        this.scavengingTimeData.villages.push({
                            villageId: village.id,
                            villageName: village.name,
                            lastUpdated: new Date(),
                            levels: [] // Puste poziomy oznaczają błąd podczas zbierania danych
                        });
                    }
                }

                this.logger.log(`=== Pre-filtering completed. ${villagesToProcess.length}/${villages.length} villages selected for processing ===`);

                if (villagesToProcess.length === 0) {
                    this.logger.log('No villages require scavenging. All villages are either busy or have no units.');
                    return;
                }

                // DISPATCH PHASE: Teraz przetwarzaj tylko wioski które mają dostępne poziomy i auto-scavenging włączony
                this.logger.log('=== DISPATCH PHASE: Processing selected villages ===');
                let totalSuccessfulDispatches = 0;

                for (let i = 0; i < villagesToProcess.length; i++) {
                    const village = villagesToProcess[i];
                    this.logger.log(`Processing scavenging for village ${i + 1}/${villagesToProcess.length}: ${village.name} (ID: ${village.id})`);

                    try {
                        // Nawigacja do zakładki Zbieractwo dla konkretnej wioski
                        const scavengingUrl = `https://${serverCode}.plemiona.pl/game.php?village=${village.id}&screen=place&mode=scavenge`;
                        this.logger.log(`Navigating to scavenging page for village ${village.name}: ${scavengingUrl}`);
                        await page.goto(scavengingUrl, { waitUntil: 'networkidle', timeout: 15000 });
                        this.logger.log(`Scavenging page loaded for village ${village.name}`);

                        // 1. Odczytaj dostępne jednostki w tej wiosce
                        const availableUnits = await ScavengingUtils.getAvailableUnits(page);
                        console.log("availableUnits v2");
                        console.log(availableUnits);

                        // 2. Sprawdź status poziomów zbieractwa w tej wiosce (ponownie, bo mogło się zmienić)
                        const levelStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);

                        // Sprawdź, czy którykolwiek poziom zbieractwa jest zajęty
                        const busyLevels = levelStatuses.filter(s => s.isBusy);
                        if (busyLevels.length > 0) {
                            this.logger.log(`Village ${village.name} has ${busyLevels.length} busy scavenging levels. Skipping to next village.`);
                            continue;
                        }

                        // Kontynuuj tylko jeśli wszystkie poziomy zbieractwa są dostępne
                        const freeLevels = levelStatuses.filter(s => s.isAvailable);

                        if (freeLevels.length === 0) {
                            this.logger.log(`No free scavenging levels available in village ${village.name}. Skipping to next village.`);
                            continue;
                        }

                        this.logger.log(`Village ${village.name} has ${freeLevels.length} free levels: ${freeLevels.map(l => l.level).join(', ')}`);

                        // 3. Oblicz dystrybucję wojsk dla tej wioski
                        const dispatchPlan = ScavengingUtils.calculateTroopDistribution(availableUnits, freeLevels);

                        if (!dispatchPlan || dispatchPlan.length === 0) {
                            this.logger.log(`Could not calculate troop distribution for village ${village.name}. Skipping to next village.`);
                            continue;
                        }

                        // 4. Wypełnij formularze i wyloguj plan dystrybucji
                        ScavengingUtils.logDispatchPlan(dispatchPlan, village.name);

                        // 5. Wypełnij i wyślij każdy poziom po kolei, czekając na przeładowanie strony po każdym
                        this.logger.log(`Starting scavenging missions for village ${village.name}...`);
                        let villageSuccessfulDispatches = 0;

                        // Sortuj poziomy od najniższego do najwyższego (najpierw poziom 1, potem 2, itd.)
                        const sortedPlans = [...dispatchPlan].sort((a, b) => a.level - b.level);

                        for (const levelPlan of sortedPlans) {
                            // Po każdym przeładowaniu strony musimy odczytać nowe statusy poziomów
                            const currentStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);
                            const levelStatus = currentStatuses.find(s => s.level === levelPlan.level);

                            if (!levelStatus || !levelStatus.isAvailable) {
                                this.logger.warn(`Level ${levelPlan.level} is no longer available in village ${village.name}. Skipping.`);
                                continue;
                            }

                            // Sprawdź, czy mamy jednostki do wysłania dla tego poziomu
                            const hasUnitsToSend = Object.values(levelPlan.dispatchUnits).some(count => count > 0);
                            if (!hasUnitsToSend) {
                                this.logger.debug(`No units to send for level ${levelPlan.level} in village ${village.name}. Skipping.`);
                                continue;
                            }

                            this.logger.log(`Processing level ${levelPlan.level} in village ${village.name}...`);

                            // 1. Wypełnij formularz dla tego poziomu
                            const filledSuccessfully = await ScavengingUtils.fillUnitsForLevel(page, levelPlan, village.name);

                            if (!filledSuccessfully) {
                                this.logger.warn(`Could not fill all inputs for level ${levelPlan.level} in village ${village.name}. Skipping.`);
                                continue;
                            }

                            // 2. Kliknij Start dla tego poziomu
                            try {
                                // Sprawdź czy przycisk Start jest widoczny
                                const startButton = levelStatus.containerLocator.locator(levelSelectors.levelStartButton);

                                if (await startButton.isVisible({ timeout: 2000 })) {
                                    // Logi informacyjne o wysyłce - tylko gdy przycisk Start jest dostępny
                                    ScavengingUtils.logDispatchInfo(levelPlan, village.name);

                                    // Pobierz faktyczny czas trwania z interfejsu gry
                                    let actualDurationSeconds = 0;
                                    try {
                                        // Selektor do czasu trwania zbieractwa w kontenerze tego poziomu
                                        const timeSelector = '.duration';
                                        const timeElement = levelStatus.containerLocator.locator(timeSelector);

                                        if (await timeElement.isVisible({ timeout: 2000 })) {
                                            const durationText = await timeElement.textContent();
                                            if (durationText) {
                                                this.logger.log(`  * Faktyczny czas zbieractwa: ${durationText.trim()}`);
                                                actualDurationSeconds = ScavengingUtils.parseTimeToSeconds(durationText.trim());
                                            } else {
                                                this.logger.log(`  * Nie udało się odczytać czasu zbieractwa`);
                                            }
                                        } else {
                                            this.logger.log(`  * Element czasu zbieractwa nie jest widoczny`);
                                        }
                                    } catch (timeError) {
                                        this.logger.log(`  * Błąd podczas odczytu czasu zbieractwa: ${timeError.message}`);
                                    }

                                    // Faktyczne kliknięcie przycisku Start
                                    await startButton.click();
                                    this.logger.log(`Clicked Start for level ${levelPlan.level} in village ${village.name}`);
                                    villageSuccessfulDispatches++;
                                    totalSuccessfulDispatches++;

                                    // AKTUALIZACJA STANU WIOSKI PO DISPATCH
                                    this.updateVillageStateAfterDispatch(village.id, levelPlan.level, actualDurationSeconds);

                                    // Poczekaj na przeładowanie strony po kliknięciu
                                    this.logger.debug(`Waiting for page to reload after starting level ${levelPlan.level} in village ${village.name}...`);
                                    await page.waitForLoadState('networkidle', { timeout: 5000 });
                                    await page.waitForTimeout(1000); // Dodatkowe opóźnienie dla stabilności
                                    this.logger.debug(`Page reloaded after starting level ${levelPlan.level} in village ${village.name}`);
                                } else {
                                    this.logger.warn(`Start button not visible for level ${levelPlan.level} in village ${village.name}, skipping dispatch.`);
                                }

                            } catch (clickError) {
                                this.logger.error(`Error in scavenging for level ${levelPlan.level} in village ${village.name}:`, clickError);
                            }
                        }

                        if (villageSuccessfulDispatches > 0) {
                            this.logger.log(`Successfully dispatched ${villageSuccessfulDispatches} scavenging missions from village ${village.name}.`);
                        } else {
                            this.logger.log(`No scavenging missions were dispatched from village ${village.name}.`);
                        }

                        // Małe opóźnienie między wioskami aby nie przeciążać serwera
                        if (i < villagesToProcess.length - 1) { // Nie opóźniaj po ostatniej wiosce
                            await page.waitForTimeout(2000);
                        }

                    } catch (villageError) {
                        this.logger.error(`Error processing scavenging for village ${village.name}:`, villageError);
                        // Kontynuuj z następną wioską nawet jeśli aktualna się nie udała
                        continue;
                    }
                }

                // Podsumowanie dla wszystkich wiosek
                if (totalSuccessfulDispatches > 0) {
                    this.logger.log(`=== SCAVENGING SUMMARY ===`);
                    this.logger.log(`Successfully dispatched ${totalSuccessfulDispatches} scavenging missions across ${villagesToProcess.length} villages.`);
                    this.logger.log(`========================`);
                } else {
                    this.logger.log(`=== SCAVENGING SUMMARY ===`);
                    this.logger.log(`No scavenging missions were dispatched across ${villagesToProcess.length} villages.`);
                    this.logger.log(`========================`);
                }

                // Scavenging completed - orchestrator will handle scheduling

            } catch (error) {
                this.logger.error('Error during scavenging process:', error);
                throw error; // Let orchestrator handle the error
            }
        } catch (error) {
            this.logger.error('Error during scavenging process:', error);
            throw error; // Let orchestrator handle the error
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Aktualizuje stan wioski po wysłaniu wojsk na zbieractwo
     * @param villageId ID wioski
     * @param level Poziom zbieractwa który został uruchomiony
     * @param durationSeconds Czas trwania misji w sekundach
     */
    private updateVillageStateAfterDispatch(villageId: string, level: number, durationSeconds: number): void {
        const villageData = this.scavengingTimeData.villages.find(v => v.villageId === villageId);
        if (!villageData) {
            this.logger.warn(`Cannot update village state - village ${villageId} not found in scavenging data`);
            return;
        }

        // Znajdź poziom do aktualizacji
        const levelData = villageData.levels.find(l => l.level === level);
        if (!levelData) {
            this.logger.warn(`Cannot update village state - level ${level} not found in village ${villageId} data`);
            return;
        }

        // Aktualizuj stan poziomu na "busy"
        const now = new Date();
        levelData.status = 'busy';
        levelData.timeRemainingSeconds = durationSeconds;
        levelData.estimatedCompletionTime = new Date(now.getTime() + (durationSeconds * 1000));

        // Sformatuj czas pozostały
        if (durationSeconds > 0) {
            const hours = Math.floor(durationSeconds / 3600);
            const minutes = Math.floor((durationSeconds % 3600) / 60);
            const seconds = durationSeconds % 60;
            levelData.timeRemaining = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            levelData.timeRemaining = '0:00:00';
        }

        this.logger.debug(`Updated village ${villageData.villageName} level ${level} status to busy (${levelData.timeRemaining} remaining)`);
    }

    /**
     * Planuje następne uruchomienie zbieractwa na podstawie zebranych danych
     * Nowa logika: używa czasów z scavengingTimeData
     */
    private async scheduleNextScavengeRun(page: Page, serverId: number, fallbackDelaySeconds: number = 300): Promise<void> {
        let delaySeconds = fallbackDelaySeconds; // Domyślnie fallback

        // Spróbuj użyć nowej logiki opartej na scavengingTimeData
        const optimalTime = ScavengingUtils.calculateOptimalScheduleTime(this.scavengingTimeData);

        if (optimalTime !== null) {
            // Użyj czasu z nowej logiki + buffer
            const bufferSeconds = getRandomScheduleBuffer();
            delaySeconds = optimalTime + bufferSeconds;
            this.logger.log(`Using optimal schedule time: ${optimalTime}s + buffer ${bufferSeconds}s = ${delaySeconds}s`);
        } else {
            // Fallback do starej logiki odczytu bezpośrednio ze strony
            this.logger.warn('Could not calculate optimal schedule time, falling back to page reading...');

            const fallbackResult = await ScavengingUtils.getFallbackScheduleTime(page);

            if (fallbackResult.successfullyReadTime && fallbackResult.maxRemainingTimeSeconds > 0) {
                const bufferSeconds = getRandomScheduleBuffer();
                delaySeconds = fallbackResult.maxRemainingTimeSeconds + bufferSeconds;
                this.logger.log(`Fallback: Found max remaining time: ${fallbackResult.maxRemainingTimeSeconds}s + buffer ${bufferSeconds}s = ${delaySeconds}s`);
            } else {
                this.logger.warn(`Fallback failed or no active missions found. Using default delay: ${fallbackDelaySeconds}s`);
                delaySeconds = fallbackDelaySeconds;
            }
        }

        // Ograniczenie delaySeconds do maksymalnie 24 godzin (86400 sekund)
        const maxDelaySeconds = 24 * 60 * 60; // 24 godziny
        if (delaySeconds > maxDelaySeconds) {
            this.logger.warn(`Calculated delay ${delaySeconds}s exceeds maximum allowed (${maxDelaySeconds}s). Using maximum.`);
            delaySeconds = maxDelaySeconds;
        }

        // Ograniczenie delaySeconds do minimum 30 sekund
        const minDelaySeconds = 30;
        if (delaySeconds < minDelaySeconds) {
            this.logger.warn(`Calculated delay ${delaySeconds}s is below minimum (${minDelaySeconds}s). Using minimum.`);
            delaySeconds = minDelaySeconds;
        }

        const nextRunTime = new Date(Date.now() + delaySeconds * 1000);
        this.logger.log(`Next scavenging run scheduled for: ${nextRunTime.toLocaleString()} (in ${delaySeconds} seconds)`);

        // Resetuj dane o czasach na koniec cyklu
        this.scavengingTimeData = {
            lastCollected: new Date(),
            villages: []
        };

        // Zaplanuj następne uruchomienie
        await setTimeout(delaySeconds * 1000);
        this.logger.log('Timeout completed. Starting next scavenging cycle...');

        // Check if auto-scavenging is still enabled before scheduling another run
        const autoScavengingEnabled = await this.isAutoScavengingEnabled(serverId);

        if (autoScavengingEnabled) {
            this.logger.log('Auto-scavenging is enabled. Triggering next scavenging run...');
            // Uruchom w trybie headless, bo to automatyczne wywołanie
            this.runScavengingBot(serverId, { headless: true }).catch(err => {
                this.logger.error('Error during scheduled scavenging run:', err);
            });
        } else {
            this.logger.log('Auto-scavenging is disabled. Bot will not run again until enabled.');
        }
    }

    /**
     * Zbiera szczegółowe dane o czasach scavenging dla konkretnej wioski
     */
    private async collectScavengingTimeData(page: Page, villageId: string, villageName: string): Promise<VillageScavengingData> {
        return await ScavengingUtils.collectScavengingTimeData(page, villageId, villageName);
    }

    /**
     * Oblicza optymalny czas do następnego uruchomienia na podstawie zebranych danych
     * Logika: znajdź najkrótszy z najdłuższych czasów busy z każdej wioski
     * @returns Czas w sekundach do następnego uruchomienia lub null jeśli brak danych
     */
    private calculateOptimalScheduleTime(): number | null {
        return ScavengingUtils.calculateOptimalScheduleTime(this.scavengingTimeData);
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
     * @returns Aktualne dane o czasach scavenging
     */
    public getScavengingTimeData(): ScavengingTimeData {
        return this.scavengingTimeData;
    }

    /**
     * Zwraca zebrane dane o czasach scavenging dla konkretnej wioski
     * @param villageId ID wioski
     * @returns Dane o czasach scavenging dla wioski lub null jeśli nie znaleziono
     */
    public getVillageScavengingData(villageId: string): VillageScavengingData | null {
        return this.scavengingTimeData.villages.find(v => v.villageId === villageId) || null;
    }

    /**
     * Performs an attack by logging in, navigating to attack page, selecting units and attacking
     */
    public async performAttack(config: AttackConfig, serverName: string): Promise<void> {
        this.logger.log(`Starting attack sequence for village ${config.id}...`);
        const { browser, context, page } = await createBrowserPage({ headless: true });

        try {
            // Use AuthUtils for login and world selection
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (loginResult.success && loginResult.worldSelected) {
                this.logger.log(`Login successful using method: ${loginResult.method}`);

                // Navigate to the specific attack page
                const attackUrl = config.link;
                this.logger.log(`Navigating to attack page for village ${config.id}: ${attackUrl}`);
                await page.goto(attackUrl, { waitUntil: 'networkidle', timeout: 15000 });

                // Wait for page to load completely
                await page.waitForTimeout(2000);

                // Click on units_entry_all_axe to add all axe units
                this.logger.log('Adding all axe units...');
                const axeLink = page.locator('#units_entry_all_axe');
                if (await axeLink.isVisible({ timeout: 5000 })) {
                    await axeLink.click();
                    await page.waitForTimeout(500);
                    this.logger.log('✓ All axe units added');
                } else {
                    this.logger.warn('Axe units link not found or not visible');
                }

                // Click on units_entry_all_light to add all light cavalry units
                this.logger.log('Adding all light cavalry units...');
                const lightLink = page.locator('#units_entry_all_light');
                if (await lightLink.isVisible({ timeout: 5000 })) {
                    await lightLink.click();
                    await page.waitForTimeout(500);
                    this.logger.log('✓ All light cavalry units added');
                } else {
                    this.logger.warn('Light cavalry units link not found or not visible');
                }

                // Click on units_entry_all_ram to add all ram units
                this.logger.log('Adding all ram units...');
                const ramLink = page.locator('#units_entry_all_ram');
                if (await ramLink.isVisible({ timeout: 5000 })) {
                    await ramLink.click();
                    await page.waitForTimeout(500);
                    this.logger.log('✓ All ram units added');
                } else {
                    this.logger.warn('Ram units link not found or not visible');
                }

                // Click on units_entry_all_snob to add all snob units
                this.logger.log('Adding all snob units...');
                const snobLink = page.locator('#units_entry_all_snob');
                if (await snobLink.isVisible({ timeout: 5000 })) {
                    await snobLink.click();
                    await page.waitForTimeout(500);
                    this.logger.log('✓ All snob units added');
                } else {
                    this.logger.warn('Snob units link not found or not visible');
                }

                // Click the attack button
                this.logger.log('Clicking attack button...');
                const attackButton = page.locator('#target_attack');
                if (await attackButton.isVisible({ timeout: 5000 })) {
                    await attackButton.click();
                    this.logger.log('✓ Attack button clicked successfully');

                    // Wait for the confirmation page to load
                    await page.waitForLoadState('networkidle', { timeout: 10000 });
                    await page.waitForTimeout(2000);
                    this.logger.log('Confirmation page loaded');

                    // Click the confirmation button
                    this.logger.log('Clicking confirmation button...');
                    const confirmButton = page.locator('#troop_confirm_submit');
                    if (await confirmButton.isVisible({ timeout: 5000 })) {
                        await confirmButton.click();
                        this.logger.log('✓ Confirmation button clicked successfully');

                        // Wait a bit to see the final result
                        await page.waitForTimeout(3000);
                        this.logger.log(`Attack sequence completed successfully for village ${config.id}`);
                    } else {
                        this.logger.warn('Confirmation button not found or not visible');
                    }
                } else {
                    this.logger.warn('Attack button not found or not visible');
                }

            } else {
                this.logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
                throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            }

        } catch (error) {
            this.logger.error(`Error during attack sequence for village ${config.id}:`, error);
            await page.screenshot({
                path: `attack_error_screenshot_${Date.now()}.png`,
                fullPage: true
            }).catch(e => this.logger.error('Failed to take error screenshot', e));
            throw error;
        } finally {
            // Close browser
            await browser.close();
            this.logger.log(`Attack sequence finished for village ${config.id} - browser closed`);
        }
    }

    /**
     * Performs a support action by logging in, navigating to support page, selecting units and sending support
     */
    public async performSupport(config: AttackConfig, serverName: string): Promise<void> {
        this.logger.log(`Starting support sequence for village ${config.id}...`);
        const { browser, context, page } = await createBrowserPage({ headless: true });

        try {
            // Use AuthUtils for login and world selection
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (loginResult.success && loginResult.worldSelected) {
                this.logger.log(`Login successful using method: ${loginResult.method}`);

                // Navigate to the specific support page (same as attack page)
                const supportUrl = config.link;
                this.logger.log(`Navigating to support page for village ${config.id}: ${supportUrl}`);
                await page.goto(supportUrl, { waitUntil: 'networkidle', timeout: 15000 });

                // Wait for page to load completely
                await page.waitForTimeout(2000);

                // Click on units_entry_all_spear to add all spear units
                this.logger.log('Adding all spear units...');
                const spearLink = page.locator('#units_entry_all_spear');
                if (await spearLink.isVisible({ timeout: 5000 })) {
                    await spearLink.click();
                    await page.waitForTimeout(500);
                    this.logger.log('✓ All spear units added');
                } else {
                    this.logger.warn('Spear units link not found or not visible');
                }

                // Click on units_entry_all_sword to add all sword units
                this.logger.log('Adding all sword units...');
                const swordLink = page.locator('#units_entry_all_sword');
                if (await swordLink.isVisible({ timeout: 5000 })) {
                    await swordLink.click();
                    await page.waitForTimeout(500);
                    this.logger.log('✓ All sword units added');
                } else {
                    this.logger.warn('Sword units link not found or not visible');
                }

                // Click on units_entry_all_archer to add all archer units
                this.logger.log('Adding all archer units...');
                const archerLink = page.locator('#units_entry_all_archer');
                if (await archerLink.isVisible({ timeout: 5000 })) {
                    await archerLink.click();
                    await page.waitForTimeout(500);
                    this.logger.log('✓ All archer units added');
                } else {
                    this.logger.warn('Archer units link not found or not visible');
                }

                // Click the support button
                this.logger.log('Clicking support button...');
                const supportButton = page.locator('#target_support');
                if (await supportButton.isVisible({ timeout: 5000 })) {
                    await supportButton.click();
                    this.logger.log('✓ Support button clicked successfully');

                    // Wait for the confirmation page to load
                    await page.waitForLoadState('networkidle', { timeout: 10000 });
                    await page.waitForTimeout(2000);
                    this.logger.log('Confirmation page loaded');

                    // Click the confirmation button
                    this.logger.log('Clicking confirmation button...');
                    const confirmButton = page.locator('#troop_confirm_submit');
                    if (await confirmButton.isVisible({ timeout: 5000 })) {
                        await confirmButton.click();
                        this.logger.log('✓ Confirmation button clicked successfully');

                        // Wait a bit to see the final result
                        await page.waitForTimeout(3000);
                        this.logger.log(`Support sequence completed successfully for village ${config.id}`);
                    } else {
                        this.logger.warn('Confirmation button not found or not visible');
                    }
                } else {
                    this.logger.warn('Support button not found or not visible');
                }

            } else {
                this.logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
                throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            }

        } catch (error) {
            this.logger.error(`Error during support sequence for village ${config.id}:`, error);
            await page.screenshot({
                path: `support_error_screenshot_${Date.now()}.png`,
                fullPage: true
            }).catch(e => this.logger.error('Failed to take error screenshot', e));
            throw error;
        } finally {
            // Close browser
            await browser.close();
            this.logger.log(`Support sequence finished for village ${config.id} - browser closed`);
        }
    }
}
