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
	scheduleBufferSeconds,
	ScavengingUnit
} from '../utils/scavenging.config'; // Import konfiguracji
import { setTimeout } from 'timers/promises'; // Użycie promisowej wersji setTimeout
import { SettingsService } from '../settings/settings.service';
import { SettingsKey } from '../settings/settings-keys.enum';
import { ConfigService } from '@nestjs/config';
import { VillageOverviewPage, VillageData } from './pages/village-overview.page';
import { VillageDetailPage } from './pages/village-detail.page';
import { ScavengingUtils } from './utils/scavenging.utils';
import {
	ScavengeLevelStatus,
	ScavengingLevelTimeData,
	VillageScavengingData,
	ScavengingTimeData,
	LevelDispatchPlan
} from './utils/scavenging.interfaces';

// Interfejs dla pliku cookie
interface PlemionaCookie {
	name: string;
	value: string;
	domain: string;
	path: string;
	expires: number;
}

@Injectable()
export class CrawlerService implements OnModuleInit {
	private readonly logger = new Logger(CrawlerService.name);
	// Constants for Plemiona Login
	private readonly PLEMIONA_LOGIN_URL = 'https://www.plemiona.pl/'; // Replace with the actual login page if different
	private readonly PLEMIONA_USERNAME_SELECTOR = 'textbox[name="Nazwa gracza:"]';
	private readonly PLEMIONA_PASSWORD_SELECTOR = 'textbox[name="Hasło:"]';
	private readonly PLEMIONA_LOGIN_BUTTON_SELECTOR = 'link[name="Logowanie"]';
	private readonly PLEMIONA_WORLD_SELECTOR = (worldName: string) => `text=${worldName}`; // Example: 'Świat 214'

	// Game credentials from environment variables
	private readonly PLEMIONA_USERNAME: string;
	private readonly PLEMIONA_PASSWORD: string;
	private readonly PLEMIONA_TARGET_WORLD: string;

	private villageData: VillageData[] = [];

	// Nowa zmienna klasowa do przechowywania danych o czasach scavenging
	private scavengingTimeData: ScavengingTimeData = {
		lastCollected: new Date(),
		villages: []
	};

	constructor(
		private settingsService: SettingsService,
		private configService: ConfigService
	) {
		// Initialize credentials from environment variables with default values if not set
		this.PLEMIONA_USERNAME = this.configService.get<string>('PLEMIONA_USERNAME') || '';
		this.PLEMIONA_PASSWORD = this.configService.get<string>('PLEMIONA_PASSWORD') || '';
		this.PLEMIONA_TARGET_WORLD = this.configService.get<string>('PLEMIONA_TARGET_WORLD') || '';

		// Check for missing credentials
		const missingCredentials: string[] = [];
		if (!this.PLEMIONA_USERNAME) missingCredentials.push('PLEMIONA_USERNAME');
		if (!this.PLEMIONA_PASSWORD) missingCredentials.push('PLEMIONA_PASSWORD');
		if (!this.PLEMIONA_TARGET_WORLD) missingCredentials.push('PLEMIONA_TARGET_WORLD');

		if (missingCredentials.length > 0) {
			this.logger.warn(`Missing environment variables: ${missingCredentials.join(', ')}. Fallback to cookies will be attempted.`);
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
		this.logger.log(`Starting Plemiona Scavenging Bot for user: ${this.PLEMIONA_USERNAME}`);
		const { browser, context, page } = await createBrowserPage(options);

		try {
			let cookiesAdded = false;
			try {
				await this.addPlemionaCookies(context);
				cookiesAdded = true;
			} catch (cookieError) {
				this.logger.warn('Failed to add cookies. Will attempt manual login.', cookieError);
				// Continue with manual login
			}

			await page.goto(this.PLEMIONA_LOGIN_URL, { waitUntil: 'networkidle' });
			this.logger.log(`Navigated to ${this.PLEMIONA_LOGIN_URL}`);

			const worldSelectorVisible = await page.isVisible(this.PLEMIONA_WORLD_SELECTOR(this.PLEMIONA_TARGET_WORLD));

			if (worldSelectorVisible && cookiesAdded) {
				this.logger.log('Login via cookies appears successful (world selector visible).');
			} else {
				this.logger.log('World selector not immediately visible, attempting manual login.');
				await this.loginToPlemiona(page); // Fallback to manual login
				this.logger.log('Manual login attempted.');
			}

			// --- World Selection ---
			if (await page.isVisible(this.PLEMIONA_WORLD_SELECTOR(this.PLEMIONA_TARGET_WORLD))) {
				try {
					await page.getByText(this.PLEMIONA_TARGET_WORLD).click();
					this.logger.log(`Selected world: ${this.PLEMIONA_TARGET_WORLD}`);
					await page.waitForLoadState('networkidle', { timeout: 15000 }); // Czekaj na załadowanie strony świata
					this.logger.log('World page loaded.');

					// --- Uruchomienie procesu zbieractwa --- 
					await this.performScavenging(page);

				} catch (worldSelectionOrScavengingError) {
					this.logger.error(`Error during world selection or scavenging: ${worldSelectionOrScavengingError}`);
				}
			} else {
				this.logger.warn('World selector not visible after login attempt. Cannot proceed to scavenging.');
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
			this.logger.log('Starting scavenging process for all villages...');

			// Najpierw zbierz informacje o wszystkich wioskach
			let villages: VillageData[] = [];
			try {
				villages = await this.collectVillageOverviewData(page);
				if (!villages || villages.length === 0) {
					this.logger.warn('No villages found. Cannot perform scavenging.');
					await this.scheduleNextScavengeRun(page, 300);
					return;
				}
				this.logger.log(`Found ${villages.length} villages to process for scavenging`);
			} catch (villageError) {
				this.logger.error('Error collecting village data:', villageError);
				await this.scheduleNextScavengeRun(page, 600); // Spróbuj ponownie za 10 minut
				return;
			}

			// Zresetuj dane o czasach scavenging przed rozpoczęciem nowego cyklu
			this.scavengingTimeData = {
				lastCollected: new Date(),
				villages: []
			};

			// Iteruj po każdej wiosce
			let totalSuccessfulDispatches = 0;
			for (let i = 0; i < villages.length; i++) {
				const village = villages[i];
				this.logger.log(`Processing scavenging for village ${i + 1}/${villages.length}: ${village.name} (ID: ${village.id})`);

				try {
					// Nawigacja do zakładki Zbieractwo dla konkretnej wioski
					const scavengingUrl = `https://pl214.plemiona.pl/game.php?village=${village.id}&screen=place&mode=scavenge`;
					this.logger.log(`Navigating to scavenging page for village ${village.name}: ${scavengingUrl}`);
					await page.goto(scavengingUrl, { waitUntil: 'networkidle', timeout: 15000 });
					this.logger.log(`Scavenging page loaded for village ${village.name}`);

					// Zbierz dane o czasach scavenging dla tej wioski
					const villageScavengingData = await ScavengingUtils.collectScavengingTimeData(page, village.id, village.name);
					this.scavengingTimeData.villages.push(villageScavengingData);

					// Wyloguj zebrane dane o czasach
					ScavengingUtils.logScavengingTimeData(villageScavengingData);

					// 1. Odczytaj dostępne jednostki w tej wiosce
					const availableUnits = await ScavengingUtils.getAvailableUnits(page);
					this.logger.log(`Available units in ${village.name}:`, availableUnits);

					// Sprawdź, czy wioska ma jakiekolwiek jednostki do wysłania
					const totalUnitsAvailable = Object.values(availableUnits).reduce((sum, count) => sum + (count || 0), 0);
					if (totalUnitsAvailable === 0) {
						this.logger.log(`No units available in village ${village.name}. Skipping to next village.`);
						continue;
					}

					// 2. Sprawdź status poziomów zbieractwa w tej wiosce
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
								try {
									// Selektor do czasu trwania zbieractwa w kontenerze tego poziomu
									const timeSelector = '.duration';
									const timeElement = levelStatus.containerLocator.locator(timeSelector);

									if (await timeElement.isVisible({ timeout: 2000 })) {
										const durationText = await timeElement.textContent();
										if (durationText) {
											this.logger.log(`  * Faktyczny czas zbieractwa: ${durationText.trim()}`);
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
					if (i < villages.length - 1) { // Nie opóźniaj po ostatniej wiosce
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
				this.logger.log(`Successfully dispatched ${totalSuccessfulDispatches} scavenging missions across ${villages.length} villages.`);
				this.logger.log(`========================`);
			} else {
				this.logger.warn('No scavenging missions were successfully dispatched from any village.');
			}

			// 6. Zaplanuj następne uruchomienie
			await this.scheduleNextScavengeRun(page);

		} catch (error) {
			this.logger.error('Error during scavenging cycle:', error);
			// Spróbuj zaplanować ponowne uruchomienie nawet po błędzie
			try {
				await this.scheduleNextScavengeRun(page, 600); // Spróbuj ponownie za 10 minut
			} catch (scheduleError) {
				this.logger.error('Failed to schedule next run after error:', scheduleError);
			}
		} finally {
			// Zamknij przeglądarkę po zakończeniu cyklu (udanym lub nie)
			const browser = page.context().browser();
			if (browser) {
				// await browser.close();
				this.logger.log('Browser closed after scavenging cycle.');
			}
		}
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
			delaySeconds = optimalTime + scheduleBufferSeconds;
			this.logger.log(`Using optimal schedule time: ${optimalTime}s + buffer ${scheduleBufferSeconds}s = ${delaySeconds}s`);
		} else {
			// Fallback do starej logiki odczytu bezpośrednio ze strony
			this.logger.warn('Could not calculate optimal schedule time, falling back to page reading...');

			const fallbackResult = await ScavengingUtils.getFallbackScheduleTime(page);

			if (fallbackResult.successfullyReadTime && fallbackResult.maxRemainingTimeSeconds > 0) {
				delaySeconds = fallbackResult.maxRemainingTimeSeconds + scheduleBufferSeconds;
				this.logger.log(`Fallback: Found max remaining time: ${fallbackResult.maxRemainingTimeSeconds}s + buffer ${scheduleBufferSeconds}s = ${delaySeconds}s`);
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
	 * Adds Plemiona cookies to the browser context.
	 * Now fetches cookies from the database using SettingsService.
	 * @param context - The Playwright BrowserContext object.
	 */
	private async addPlemionaCookies(context: BrowserContext): Promise<void> {
		try {
			// Fetch cookies from settings
			const cookiesData = await this.settingsService.getSetting<PlemionaCookie[]>(SettingsKey.PLEMIONA_COOKIES);

			if (!cookiesData || cookiesData.length === 0) {
				throw new Error('No Plemiona cookies found in settings');
			}

			// Transform cookies data from DB to the full format needed by Playwright
			const cookies = cookiesData.map(cookie => ({
				...cookie,
				httpOnly: true,  // Default values for static properties
				secure: true,
				sameSite: 'Lax' as 'Lax' | 'Strict' | 'None'
			}));

			await context.addCookies(cookies);
			this.logger.log('Successfully added Plemiona cookies to browser context.');
		} catch (error) {
			this.logger.error('Failed to add Plemiona cookies', error);
			// Let the caller handle this failure
		}
	}

	/**
	 * Navigates to the Plemiona login page and fills in credentials.
	 * Assumes cookies didn't grant access.
	 * @param page - The Playwright Page object.
	 */
	private async loginToPlemiona(page: Page): Promise<void> {
		// No navigation needed here usually, as we are already on the page from performPlemionaLogin
		// If navigation IS needed, uncomment below:
		// await page.goto(this.PLEMIONA_LOGIN_URL, { waitUntil: 'networkidle' });
		// this.logger.log(`Navigated to ${this.PLEMIONA_LOGIN_URL} for manual login`);

		try {
			// --- Fill Username ---
			await page.getByRole('textbox', { name: 'Nazwa gracza:' }).fill(this.PLEMIONA_USERNAME);
			this.logger.log('Filled username for manual login.');

			// --- Fill Password ---
			await page.getByRole('textbox', { name: 'Hasło:' }).fill(this.PLEMIONA_PASSWORD);
			this.logger.log('Filled password for manual login.');

			// --- Click Login ---
			await page.getByRole('link', { name: 'Logowanie' }).click();
			this.logger.log('Clicked login button for manual login.');

			// Wait for potential page load/redirect after login click
			await page.waitForTimeout(3000); // Adjust as needed or use waitForNavigation/waitForSelector
		} catch (error) {
			this.logger.error('Error during manual login steps', error);
			// Rethrow or handle as appropriate for performPlemionaLogin
			throw error;
		}
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
	 * Collects information about villages including resources, building levels, etc.
	 * Uses Page Object Model (POM) approach for better maintainability.
	 * This method will be implemented to gather comprehensive village data.
	 */
	public async collectVillageInformation(): Promise<void> {
		this.logger.log('Starting village information collection using POM approach');
		// TODO: Implement village information collection using Page Object Models
		// This will include:
		// - Resource amounts (wood, clay, iron, population)
		// - Building levels for all structures
		// - Village coordinates and name
		// - Army units count
		// - Research levels
		this.logger.log('Village information collection method called - implementation pending');

		this.logger.log(`Starting Plemiona Scavenging Bot for user: ${this.PLEMIONA_USERNAME}`);
		const { browser, context, page } = await createBrowserPage({ headless: true });

		try {
			await this.loginAndSelectServer(page);

			// Collect basic village information after successful login
			const villageData = await this.collectVillageOverviewData(page);

			// Collect detailed information for each village
			if (villageData && villageData.length > 0) {
				await this.collectDetailedVillageData(page, villageData);
			}

			this.villageData = villageData;
		} catch (error) {
			this.logger.error('Error during village information collection:', error);
		} finally {
			// Close browser after completion
			if (browser) {
				await browser.close();
				this.logger.log('Browser closed after village information collection.');
			}
		}
	}

	/**
	 * Collects village overview data using Page Object Model
	 * @param page - The Playwright Page object
	 */
	private async collectVillageOverviewData(page: Page): Promise<VillageData[]> {
		this.logger.log('=========================== Starting village overview data collection ===========================');

		try {
			// Create instance of Village Overview Page Object
			const villageOverviewPage = new VillageOverviewPage(page);

			// Navigate to village overview page
			await villageOverviewPage.navigate();
			this.logger.log('Successfully navigated to village overview page');

			// Wait for table to load
			await villageOverviewPage.waitForTableLoad();

			// Get village count
			const villageCount = await villageOverviewPage.getVillageCount();
			this.logger.log(`Found ${villageCount} villages to process`);

			// Extract all village data
			const villageData = await villageOverviewPage.extractVillageData();

			// Log collected data
			this.logger.log('=== VILLAGE OVERVIEW DATA ===');
			villageData.forEach((village, index) => {
				this.logger.log(`Village ${index + 1}:`);
				this.logger.log(`  ID: ${village.id}`);
				this.logger.log(`  Name: ${village.name}`);
				this.logger.log(`  Coordinates: ${village.coordinates}`);
				this.logger.log(`  Points: ${village.points.toLocaleString()}`);
				this.logger.log(`  Resources: Wood=${village.resources.wood.toLocaleString()}, Clay=${village.resources.clay.toLocaleString()}, Iron=${village.resources.iron.toLocaleString()}`);
				this.logger.log(`  Storage: ${village.storage.toLocaleString()}`);
				this.logger.log(`  Population: ${village.population.current}/${village.population.max}`);
				this.logger.log('  ---');
			});
			this.logger.log(`=== TOTAL VILLAGES: ${villageData.length} ===`);

			return villageData;

		} catch (error) {
			this.logger.error('Error collecting village overview data:', error);
			throw error;
		}
	}

	/**
	 * Handles login process and server selection for Plemiona.
	 * This method combines cookie-based login, manual login fallback, and world selection.
	 * @param page - The Playwright Page object to perform login operations on.
	 */
	private async loginAndSelectServer(page: Page): Promise<void> {
		this.logger.log('Starting login and server selection process');

		let cookiesAdded = false;
		try {
			await this.addPlemionaCookies(page.context());
			cookiesAdded = true;
		} catch (cookieError) {
			this.logger.warn('Failed to add cookies. Will attempt manual login.', cookieError);
			// Continue with manual login
		}

		await page.goto(this.PLEMIONA_LOGIN_URL, { waitUntil: 'networkidle' });
		this.logger.log(`Navigated to ${this.PLEMIONA_LOGIN_URL}`);

		const worldSelectorVisible = await page.isVisible(this.PLEMIONA_WORLD_SELECTOR(this.PLEMIONA_TARGET_WORLD));

		if (worldSelectorVisible && cookiesAdded) {
			this.logger.log('Login via cookies appears successful (world selector visible).');
		} else {
			this.logger.log('World selector not immediately visible, attempting manual login.');
			await this.loginToPlemiona(page); // Fallback to manual login
			this.logger.log('Manual login attempted.');
		}

		// --- World Selection ---
		if (await page.isVisible(this.PLEMIONA_WORLD_SELECTOR(this.PLEMIONA_TARGET_WORLD))) {
			try {
				await page.getByText(this.PLEMIONA_TARGET_WORLD).click();
				this.logger.log(`Selected world: ${this.PLEMIONA_TARGET_WORLD}`);
				await page.waitForLoadState('networkidle', { timeout: 15000 }); // Czekaj na załadowanie strony świata
				this.logger.log('World page loaded successfully.');
			} catch (worldSelectionError) {
				this.logger.error(`Error during world selection: ${worldSelectionError}`);
				throw worldSelectionError;
			}
		} else {
			this.logger.warn('World selector not visible after login attempt. Cannot proceed.');
			throw new Error('World selector not visible after login attempt');
		}
	}

	/**
	 * Collects detailed information for each village including building levels, army units, and queues
	 * @param page - The Playwright Page object
	 * @param villageData - Array of basic village data to enhance with detailed information
	 */
	private async collectDetailedVillageData(page: Page, villageData: VillageData[]): Promise<VillageData[]> {
		this.logger.log(`Starting detailed data collection for ${villageData.length} villages...`);

		// Create instance of Village Detail Page Object
		const villageDetailPage = new VillageDetailPage(page);

		// Process each village one by one
		for (let i = 0; i < villageData.length; i++) {
			const village = villageData[i];
			this.logger.log(`Processing detailed data for village ${i + 1}/${villageData.length}: ${village.name} (${village.id})`);

			try {
				// Navigate to specific village
				await villageDetailPage.navigateToVillage(village.id);
				this.logger.log(`Successfully navigated to village ${village.name}`);

				// Collect building levels
				this.logger.log(`Collecting building levels for ${village.name}...`);
				village.buildingLevels = await villageDetailPage.extractBuildingLevels();

				// Collect army units
				this.logger.log(`Collecting army units for ${village.name}...`);
				village.armyUnits = await villageDetailPage.extractArmyUnits();

				// Collect build queue
				this.logger.log(`Collecting build queue for ${village.name}...`);
				village.buildQueue = await villageDetailPage.extractBuildQueue();

				// Collect research queue
				this.logger.log(`Collecting research queue for ${village.name}...`);
				village.researchQueue = await villageDetailPage.extractResearchQueue();

				// Log detailed information
				this.logDetailedVillageData(village, i + 1);

				// Small delay between villages to avoid overwhelming the server
				await page.waitForTimeout(1000);

			} catch (error) {
				this.logger.error(`Error collecting detailed data for village ${village.name} (${village.id}):`, error);
				// Continue with next village even if current one fails
				continue;
			}
		}

		this.logger.log('=== DETAILED VILLAGE DATA COLLECTION COMPLETED ===');
		return villageData;
	}

	/**
	 * Logs detailed village data in a formatted way
	 * @param village - Village data to log
	 * @param index - Village index for display
	 */
	private logDetailedVillageData(village: VillageData, index: number): void {
		this.logger.log(`=== DETAILED DATA FOR VILLAGE ${index}: ${village.name} ===`);

		// Log building levels
		if (village.buildingLevels) {
			this.logger.log('Building Levels:');
			this.logger.log(`  Military: Barracks=${village.buildingLevels.barracks}, Stable=${village.buildingLevels.stable}, Workshop=${village.buildingLevels.workshop}`);
			this.logger.log(`  Resources: Timber=${village.buildingLevels.timber_camp}, Clay=${village.buildingLevels.clay_pit}, Iron=${village.buildingLevels.iron_mine}`);
			this.logger.log(`  Infrastructure: HQ=${village.buildingLevels.headquarters}, Farm=${village.buildingLevels.farm}, Warehouse=${village.buildingLevels.warehouse}, Wall=${village.buildingLevels.wall}`);
		}

		// Log army units
		if (village.armyUnits) {
			this.logger.log('Army Units:');
			this.logger.log(`  Barracks: Spear=${village.armyUnits.barracks.spear}, Sword=${village.armyUnits.barracks.sword}, Axe=${village.armyUnits.barracks.axe}, Archer=${village.armyUnits.barracks.archer}`);
			this.logger.log(`  Stable: Scout=${village.armyUnits.stable.scout}, LC=${village.armyUnits.stable.light_cavalry}, MA=${village.armyUnits.stable.mounted_archer}, HC=${village.armyUnits.stable.heavy_cavalry}`);
			this.logger.log(`  Workshop: Ram=${village.armyUnits.workshop.ram}, Catapult=${village.armyUnits.workshop.catapult}`);
			if (village.armyUnits.church) {
				this.logger.log(`  Church: Paladin=${village.armyUnits.church.paladin}`);
			}
		}

		// Log build queue
		if (village.buildQueue && village.buildQueue.length > 0) {
			this.logger.log('Build Queue:');
			village.buildQueue.forEach((item, idx) => {
				this.logger.log(`  ${idx + 1}. ${item.building} Level ${item.level} - ${item.timeRemaining} remaining`);
			});
		} else {
			this.logger.log('Build Queue: Empty');
		}

		// Log research queue
		if (village.researchQueue && village.researchQueue.length > 0) {
			this.logger.log('Research Queue:');
			village.researchQueue.forEach((item, idx) => {
				this.logger.log(`  ${idx + 1}. ${item.technology} - ${item.timeRemaining} remaining`);
			});
		} else {
			this.logger.log('Research Queue: Empty');
		}

		this.logger.log('---');
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
