import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
import { VillageOverviewPage, VillageData } from './pages/village-overview.page';
import { VillageDetailPage } from './pages/village-detail.page';
import { VillagesService } from '../villages/villages.service';
import { VillageResponseDto } from '../villages/dto';
import { ScavengingUtils } from './utils/scavenging.utils';
import {
	ScavengeLevelStatus,
	ScavengingLevelTimeData,
	VillageScavengingData,
	ScavengingTimeData,
	LevelDispatchPlan
} from './utils/scavenging.interfaces';
import { AuthUtils } from './utils/auth.utils';
import { PlemionaCredentials } from './utils/auth.interfaces';
import { VillageUtils } from './utils/village.utils';
import { VillageCollectionOptions } from './utils/village.interfaces';

@Injectable()
export class CrawlerService implements OnModuleInit {
	private readonly logger = new Logger(CrawlerService.name);

	// Game credentials from environment variables
	private readonly credentials: PlemionaCredentials;

	// Nowa zmienna klasowa do przechowywania danych o czasach scavenging
	private scavengingTimeData: ScavengingTimeData = {
		lastCollected: new Date(),
		villages: []
	};

	constructor(
		private settingsService: SettingsService,
		private configService: ConfigService,
		private villagesService: VillagesService
	) {
		// Initialize credentials from environment variables with default values if not set
		this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);

		// Validate credentials
		const validation = AuthUtils.validateCredentials(this.credentials);
		if (!validation.isValid) {
			this.logger.warn(`Invalid credentials: missing fields: ${validation.missingFields.join(', ')}, errors: ${validation.errors.join(', ')}. Fallback to cookies will be attempted.`);
		} else {
			this.logger.log('Plemiona credentials loaded from environment variables successfully.');
		}
	}

	/**
	 * Automatically starts the scavenging bot when the application initializes
	 */
	async onModuleInit() {
		// this.collectVillageInformation();
		//TODO uncomment this 
		this.startScavengingBot();


	}

	public async startScavengingBot() {
		this.logger.log('Initializing Plemiona Scavenging Bot');

		// Check if auto-scavenging is enabled (default to false if not set)
		const autoScavengingEnabled = await this.isAutoScavengingEnabled();

		if (autoScavengingEnabled) {
			this.logger.log('Auto-scavenging is enabled. Starting bot in headless mode...');
			// Start the bot in headless mode
			this.runScavengingBot({ headless: true }).catch(err => {
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
	private async isAutoScavengingEnabled(): Promise<boolean> {
		try {
			const setting = await this.settingsService.getSetting<{ value: boolean }>(SettingsKey.AUTO_SCAVENGING_ENABLED);
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
	public async runScavengingBot(options?: { headless?: boolean }): Promise<void> {
		this.logger.log(`Starting Plemiona Scavenging Bot for user: ${this.credentials.username}`);
		const { browser, context, page } = await createBrowserPage(options);

		try {
			// Use AuthUtils for comprehensive login and world selection
			const loginResult = await AuthUtils.loginAndSelectWorld(
				page,
				this.credentials,
				this.settingsService
			);

			if (loginResult.success && loginResult.worldSelected) {
				this.logger.log(`Login successful using method: ${loginResult.method}`);
				// --- Uruchomienie procesu zbieractwa --- 
				await this.performScavenging(page);
			} else {
				this.logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
				throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
			}

		} catch (error) {
			this.logger.error(`Error during Plemiona bot operation`, error);
			await page.screenshot({ path: `error_screenshot_${Date.now()}.png`, fullPage: true }).catch(e => this.logger.error('Failed to take screenshot', e));
		} finally {
			// Zamknięcie przeglądarki jest teraz obsługiwane przez logikę planowania w performScavenging
			// lub w przypadku błędu przed jej uruchomieniem.
			// await browser.close(); // Usunięte - zamykamy po zakończeniu cyklu zbieractwa
			this.logger.log('Plemiona Scavenging Bot run finished.');
		}
	}

	/**
	 * Wykonuje cykl zbieractwa: nawigacja, analiza, dystrybucja, logowanie planu i planowanie.
	 * Iteruje po wszystkich wioskach i wysyła wojsko na odprawy.
	 * @param page Instancja strony Playwright.
	 */
	private async performScavenging(page: Page): Promise<void> {
		try {
			this.logger.log('Starting scavenging process for villages with auto-scavenging enabled...');

			// Pobierz wioski z bazy danych które mają włączone auto-scavenging
			let villages: VillageResponseDto[] = [];
			try {
				const allVillages = await this.villagesService.findAll(false); // false = bez auto-refresh

				// Log all villages with their auto-scavenging status
				const enabledVillages = allVillages.filter(v => v.isAutoScavengingEnabled);
				const disabledVillages = allVillages.filter(v => !v.isAutoScavengingEnabled);

				this.logger.log(`Villages auto-scavenging status:`);
				this.logger.log(`  ✓ ENABLED (${enabledVillages.length}): ${enabledVillages.map(v => v.name).join(', ') || 'none'}`);
				this.logger.log(`  ✗ DISABLED (${disabledVillages.length}): ${disabledVillages.map(v => v.name).join(', ') || 'none'}`);

				villages = enabledVillages;

				if (!villages || villages.length === 0) {
					this.logger.warn('No villages with auto-scavenging enabled found. Cannot perform scavenging.');
					await this.scheduleNextScavengeRun(page, 300);
					return;
				}
				this.logger.log(`Found ${villages.length} villages with auto-scavenging enabled to process`);
			} catch (villageError) {
				this.logger.error('Error fetching villages from database:', villageError);
				await this.scheduleNextScavengeRun(page, 600); // Spróbuj ponownie za 10 minut
				return;
			}

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
					const scavengingUrl = `https://pl214.plemiona.pl/game.php?village=${village.id}&screen=place&mode=scavenge`;
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
						const totalUnitsAvailable = Object.values(availableUnits).reduce((sum, count) => sum + (count || 0), 0);

						if (totalUnitsAvailable > 0) {
							this.logger.log(`✓ Village ${village.name} added to processing queue (${freeLevels.length} free levels, ${totalUnitsAvailable} units available)`);
							villagesToProcess.push(village);
						} else {
							this.logger.log(`✗ Village ${village.name} skipped - no units available`);
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
				await this.scheduleNextScavengeRun(page, 60); // Sprawdź ponownie za minutę
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
					const scavengingUrl = `https://pl214.plemiona.pl/game.php?village=${village.id}&screen=place&mode=scavenge`;
					this.logger.log(`Navigating to scavenging page for village ${village.name}: ${scavengingUrl}`);
					await page.goto(scavengingUrl, { waitUntil: 'networkidle', timeout: 15000 });
					this.logger.log(`Scavenging page loaded for village ${village.name}`);

					// 1. Odczytaj dostępne jednostki w tej wiosce
					const availableUnits = await ScavengingUtils.getAvailableUnits(page);

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

			// Zaplanuj następny cykl zbieractwa na podstawie zebranych danych
			await this.scheduleNextScavengeRun(page, 300);

		} catch (error) {
			this.logger.error('Error during scavenging process:', error);
			// W przypadku błędu spróbuj ponownie za 5 minut
			await this.scheduleNextScavengeRun(page, 300);
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
	private async scheduleNextScavengeRun(page: Page, fallbackDelaySeconds: number = 300): Promise<void> {
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
		const autoScavengingEnabled = await this.isAutoScavengingEnabled();

		if (autoScavengingEnabled) {
			this.logger.log('Auto-scavenging is enabled. Triggering next scavenging run...');
			// Uruchom w trybie headless, bo to automatyczne wywołanie
			this.runScavengingBot({ headless: true }).catch(err => {
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
	public async handleCron() {
		this.logger.log('Running scheduled Plemiona check (headless by default)');
		// Sprawdź czy auto-scavenging jest włączony
		const autoScavengingEnabled = await this.isAutoScavengingEnabled();

		if (autoScavengingEnabled) {
			// Wywołuje główny proces logowania i zbieractwa
			await this.runScavengingBot({ headless: true });
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
}
