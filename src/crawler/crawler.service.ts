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

// Interfejs dla stanu poziomu zbieractwa
interface ScavengeLevelStatus {
	level: number; // Poziom (1-4)
	isLocked: boolean;
	isBusy: boolean;
	isAvailable: boolean;
	containerLocator: Locator; // Locator kontenera danego poziomu
}

// Interfejs dla planu wysyłki na jeden poziom
interface LevelDispatchPlan {
	level: number;
	dispatchUnits: Partial<Record<ScavengingUnit, number>>;
}

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
	 * @param page Instancja strony Playwright.
	 */
	private async performScavenging(page: Page): Promise<void> {
		try {
			this.logger.log('Starting scavenging process...');

			// Nawigacja do zakładki Zbieractwo przez bezpośredni URL
			const scavengingUrl = 'https://pl214.plemiona.pl/game.php?village=12142&screen=place&mode=scavenge'; // TODO: Sprawić, aby village ID było dynamiczne
			this.logger.log(`Navigating directly to Scavenging URL: ${scavengingUrl}`);
			await page.goto(scavengingUrl, { waitUntil: 'networkidle', timeout: 15000 });
			this.logger.log('Scavenging page loaded via URL.');

			// 1. Odczytaj dostępne jednostki
			const availableUnits = await this.getAvailableUnits(page);
			this.logger.log('Available units:', availableUnits);

			// 2. Sprawdź status poziomów zbieractwa
			const levelStatuses = await this.getScavengingLevelStatuses(page);

			// NOWA FUNKCJONALNOŚĆ: Sprawdź, czy którykolwiek poziom zbieractwa jest zajęty
			const busyLevels = levelStatuses.filter(s => s.isBusy);
			if (busyLevels.length > 0) {
				this.logger.log(`Found ${busyLevels.length} busy scavenging levels. Waiting for all missions to complete before starting new ones.`);

				// Oblicz maksymalny czas trwania aktywnych misji
				let maxRemainingTime = 0;
				let hasDetectedRemainingTime = false;

				for (const levelStatus of busyLevels) {
					try {
						const timerElement = levelStatus.containerLocator.locator(levelSelectors.levelTimeRemaining);
						if (await timerElement.isVisible()) {
							const timeText = await timerElement.textContent(); // Format HH:MM:SS
							if (timeText) {
								const parts = timeText.split(':').map(Number);
								if (parts.length === 3) {
									const remainingSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
									this.logger.debug(`Level ${levelStatus.level} time remaining: ${remainingSeconds}s`);
									maxRemainingTime = Math.max(maxRemainingTime, remainingSeconds);
									hasDetectedRemainingTime = true;
								}
							}
						}
					} catch (timeError) {
						this.logger.warn(`Could not read remaining time for busy level ${levelStatus.level}:`, timeError);
					}
				}

				if (hasDetectedRemainingTime) {
					const waitTimeSeconds = maxRemainingTime + scheduleBufferSeconds;
					this.logger.log(`Waiting for all missions to complete. Max remaining time: ${maxRemainingTime}s. Will check again in ${waitTimeSeconds}s.`);
					await this.scheduleNextScavengeRun(page, waitTimeSeconds);
					return; // Zakończ ten cykl
				} else {
					this.logger.log('Could not determine mission remaining times. Using fallback delay.');
					await this.scheduleNextScavengeRun(page, 300); // Sprawdź za 5 minut
					return; // Zakończ ten cykl
				}
			}

			// Kontynuuj tylko jeśli wszystkie poziomy zbieractwa są dostępne
			const freeLevels = levelStatuses.filter(s => s.isAvailable);

			if (freeLevels.length === 0) {
				this.logger.log('No free scavenging levels available.');
				// Zaplanuj sprawdzenie ponownie później
				await this.scheduleNextScavengeRun(page, 300); // Sprawdź za 5 minut
				return; // Zakończ ten cykl
			}

			this.logger.log(`Found ${freeLevels.length} free levels: ${freeLevels.map(l => l.level).join(', ')}`);

			// 3. Oblicz dystrybucję wojsk
			const dispatchPlan = this.calculateTroopDistribution(availableUnits, freeLevels);

			if (!dispatchPlan || dispatchPlan.length === 0) {
				this.logger.log('Could not calculate troop distribution (maybe no troops available or other issue).');
				// Zaplanuj sprawdzenie ponownie później
				await this.scheduleNextScavengeRun(page, 300); // Sprawdź za 5 minut
				return;
			}

			// 4. Wypełnij formularze i wyloguj plan dystrybucji
			this.logger.log('--- Calculated Scavenging Dispatch Plan ---');

			// Logowanie planowanej dystrybucji (tylko do logów)
			for (const levelPlan of dispatchPlan) {
				const unitsString = unitOrder
					.map(unit => `${unit}=${levelPlan.dispatchUnits[unit] || 0}`)
					.join(', ');
				this.logger.log(`Level ${levelPlan.level}: ${unitsString}`);
			}
			this.logger.log('---------------------------------------------------');

			// 5. Wypełnij i wyślij każdy poziom po kolei, czekając na przeładowanie strony po każdym
			this.logger.log('Starting scavenging missions for prepared levels...');
			let successfulDispatches = 0;

			// Sortuj poziomy od najniższego do najwyższego (najpierw poziom 1, potem 2, itd.)
			const sortedPlans = [...dispatchPlan].sort((a, b) => a.level - b.level);

			for (const levelPlan of sortedPlans) {
				// Po każdym przeładowaniu strony musimy odczytać nowe statusy poziomów
				const currentStatuses = await this.getScavengingLevelStatuses(page);
				const levelStatus = currentStatuses.find(s => s.level === levelPlan.level);

				if (!levelStatus || !levelStatus.isAvailable) {
					this.logger.warn(`Level ${levelPlan.level} is no longer available. Skipping.`);
					continue;
				}

				// Sprawdź, czy mamy jednostki do wysłania dla tego poziomu
				const hasUnitsToSend = Object.values(levelPlan.dispatchUnits).some(count => count > 0);
				if (!hasUnitsToSend) {
					this.logger.debug(`No units to send for level ${levelPlan.level}. Skipping.`);
					continue;
				}

				this.logger.log(`Processing level ${levelPlan.level}...`);

				// 1. Wypełnij formularz dla tego poziomu
				let filledSuccessfully = true;
				for (const unit of unitOrder) {
					const count = levelPlan.dispatchUnits[unit] || 0;
					if (count > 0) {
						try {
							// Użyj containerLocator, który jest specyficzny dla tego poziomu
							const inputSelector = `input[name="${unitInputNames[unit]}"]`;
							const unitInput = await page.locator(inputSelector);

							if (await unitInput.isVisible({ timeout: 2000 })) {
								await unitInput.fill(String(count));
								this.logger.debug(`Filled ${count} ${unit} units for level ${levelPlan.level}`);
							} else {
								this.logger.warn(`Input field for ${unit} not visible on level ${levelPlan.level}`);
								filledSuccessfully = false;
							}
						} catch (inputError) {
							this.logger.error(`Error filling ${unit} input for level ${levelPlan.level}:`, inputError);
							filledSuccessfully = false;
						}
					}
				}

				if (!filledSuccessfully) {
					this.logger.warn(`Could not fill all inputs for level ${levelPlan.level}. Skipping.`);
					continue;
				}

				// 2. Kliknij Start dla tego poziomu
				try {
					// Sprawdź czy przycisk Start jest widoczny
					const startButton = levelStatus.containerLocator.locator(levelSelectors.levelStartButton);

					if (await startButton.isVisible({ timeout: 2000 })) {
						// Logi informacyjne o wysyłce - tylko gdy przycisk Start jest dostępny
						this.logger.log(`------ WYSYŁKA WOJSKA dla POZIOMU ${levelPlan.level} ------`);
						this.logger.log(`Wojsko do wysłania na poziom ${levelPlan.level}:`);

						// Oblicz całkowitą liczbę jednostek i pojemność
						let totalUnits = 0;
						let totalCapacity = 0;
						for (const unit of unitOrder) {
							const count = levelPlan.dispatchUnits[unit] || 0;
							if (count > 0) {
								this.logger.log(`  - ${unit}: ${count} jednostek`);
								totalUnits += count;
								totalCapacity += count * unitSettings[unit].capacity;
							}
						}

						// Pobierz faktyczny czas trwania z interfejsu gry
						try {
							// Selektor do czasu trwania zbieractwa w kontenerze tego poziomu
							const timeSelector = '.duration';
							const timeElement = levelStatus.containerLocator.locator(timeSelector);

							if (await timeElement.isVisible({ timeout: 2000 })) {
								const durationText = await timeElement.textContent();
								if (durationText) {
									this.logger.log(`  * Łącznie: ${totalUnits} jednostek`);
									this.logger.log(`  * Pojemność: ${totalCapacity} surowców`);
									this.logger.log(`  * Faktyczny czas zbieractwa: ${durationText.trim()}`);
								} else {
									this.logger.log(`  * Łącznie: ${totalUnits} jednostek`);
									this.logger.log(`  * Pojemność: ${totalCapacity} surowców`);
									this.logger.log(`  * Nie udało się odczytać czasu zbieractwa`);
								}
							} else {
								this.logger.log(`  * Łącznie: ${totalUnits} jednostek`);
								this.logger.log(`  * Pojemność: ${totalCapacity} surowców`);
								this.logger.log(`  * Element czasu zbieractwa nie jest widoczny`);
							}
						} catch (timeError) {
							this.logger.log(`  * Łącznie: ${totalUnits} jednostek`);
							this.logger.log(`  * Pojemność: ${totalCapacity} surowców`);
							this.logger.log(`  * Błąd podczas odczytu czasu zbieractwa: ${timeError.message}`);
						}

						this.logger.log(`----------------------------------------------------`);

						// Faktyczne kliknięcie przycisku Start
						await startButton.click();
						this.logger.log(`Clicked Start for level ${levelPlan.level}`);
						successfulDispatches++;

						// Poczekaj na przeładowanie strony po kliknięciu
						this.logger.debug(`Waiting for page to reload after starting level ${levelPlan.level}...`);
						await page.waitForLoadState('networkidle', { timeout: 5000 });
						await page.waitForTimeout(1000); // Dodatkowe opóźnienie dla stabilności
						this.logger.debug(`Page reloaded after starting level ${levelPlan.level}`);
					} else {
						this.logger.warn(`Start button not visible for level ${levelPlan.level}, skipping dispatch.`);
					}

				} catch (clickError) {
					this.logger.error(`Error in scavenging for level ${levelPlan.level}:`, clickError);
				}
			}

			if (successfulDispatches > 0) {
				this.logger.log(`Successfully dispatched ${successfulDispatches} scavenging missions.`);
			} else {
				this.logger.warn('No scavenging missions were successfully dispatched.');
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
	 * Odczytuje liczbę dostępnych jednostek.
	 * **Wymaga dostosowania selektorów w scavenging.config.ts!**
	 */
	private async getAvailableUnits(page: Page): Promise<Partial<Record<ScavengingUnit, number>>> {
		const units: Partial<Record<ScavengingUnit, number>> = {};
		this.logger.debug('Reading available unit counts...');

		for (const unit of unitOrder) {
			try {
				const selector = availableUnitSelectors[unit];
				const unitElement = page.locator(selector);

				// Sprawdź, czy element istnieje i jest widoczny, zanim spróbujesz odczytać tekst
				if (await unitElement.isVisible({ timeout: 5000 })) { // Krótki timeout na sprawdzenie widoczności
					const countText = await unitElement.textContent(); // Odczytaj tekst np. "(203)"
					const match = countText?.match(/\((\d+)\)/); // Wyciągnij liczbę z nawiasów
					units[unit] = match ? parseInt(match[1], 10) : 0;
					this.logger.debug(`Found unit ${unit}: ${units[unit]}`);
				} else {
					this.logger.debug(`Unit element not visible for: ${unit} using selector ${selector}`);
					units[unit] = 0; // Jeśli element niewidoczny, załóż 0
				}

			} catch (error) {
				// Rozróżnij błąd timeout od innych błędów
				if (error.name === 'TimeoutError') {
					this.logger.warn(`Timeout waiting for unit element: ${unit}. Assuming 0 units.`);
				} else {
					this.logger.warn(`Could not read available count for unit: ${unit}`, error);
				}
				units[unit] = 0;
			}
		}
		return units;
	}

	/**
	 * Sprawdza status każdego poziomu zbieractwa (1-4).
	 * **Wymaga dostosowania selektorów w scavenging.config.ts!**
	 */
	private async getScavengingLevelStatuses(page: Page): Promise<ScavengeLevelStatus[]> {
		const statuses: ScavengeLevelStatus[] = [];
		// Znajdź wszystkie kontenery opcji zbieractwa
		const levelContainers = await page.locator(levelSelectors.levelContainerBase).all();
		this.logger.debug(`Found ${levelContainers.length} potential level containers using selector: ${levelSelectors.levelContainerBase}`);

		// Przetwórz tylko pierwsze 4 kontenery (lub mniej, jeśli jest ich mniej)
		for (let i = 0; i < Math.min(levelContainers.length, 4); i++) {
			const container = levelContainers[i];
			const level = i + 1; // Poziom 1, 2, 3, 4

			// Sprawdź, czy poziom jest zablokowany (szukając przycisku Odblokowanie)
			const isLocked = await container.locator(levelSelectors.levelUnlockButton).isVisible({ timeout: 1000 }); // Krótki timeout

			// Sprawdź, czy poziom ma przycisk Start (jest potencjalnie dostępny)
			const hasStartButton = await container.locator(levelSelectors.levelStartButton).isVisible({ timeout: 1000 }); // Krótki timeout

			// Określ stan:
			const isAvailable = !isLocked && hasStartButton;
			// Zajęty, jeśli nie jest zablokowany i nie jest dostępny (nie ma przycisku Start)
			const isBusy = !isLocked && !isAvailable;

			statuses.push({
				level,
				isLocked,
				isBusy,
				isAvailable,
				containerLocator: container
			});
			this.logger.debug(`Level ${level} status: Locked=${isLocked}, Busy=${isBusy}, Available=${isAvailable} (Start button found: ${hasStartButton})`);
		}

		// Zwróć statusy (maksymalnie 4)
		return statuses;
	}

	/**
	 * Oblicza dystrybucję wojsk na dostępne poziomy.
	 */
	private calculateTroopDistribution(
		availableUnits: Partial<Record<ScavengingUnit, number>>,
		freeLevels: ScavengeLevelStatus[]
	): LevelDispatchPlan[] | null {

		const dispatchPlan: LevelDispatchPlan[] = freeLevels.map(l => ({ level: l.level, dispatchUnits: {} }));
		let totalPacks = 0;

		// Filtruj poziomy i oblicz sumę packów zgodnie z skip_level_1
		const eligibleLevels = freeLevels.filter(levelStatus => {
			if (levelStatus.level === 1 && scavengingSettings.skip_level_1 === 1 && freeLevels.length > 1) {
				this.logger.log('Skipping level 1 due to skip_level_1 setting.');
				return false;
			}
			if (levelPacks[levelStatus.level]) {
				totalPacks += levelPacks[levelStatus.level];
				return true;
			}
			return false;
		});

		if (eligibleLevels.length === 0 || totalPacks === 0) {
			this.logger.warn('No eligible levels for distribution or totalPacks is zero.');
			return null;
		}

		this.logger.debug(`Total packs for distribution: ${totalPacks}`);

		const unitsToSendTotal: Partial<Record<ScavengingUnit, number>> = {};

		// 1. Oblicz ile jednostek każdego typu MOŻNA wysłać (uwzględniając limity i rezerwy)
		for (const unit of unitOrder) {
			if (scavengingSettings.archers === 0 && (unit === 'archer' || unit === 'marcher')) {
				continue; // Pomiń łuczników, jeśli wyłączone
			}
			let available = availableUnits[unit] || 0;
			const config = unitSettings[unit];

			if (available <= config.untouchable) {
				available = 0;
			} else {
				available -= config.untouchable;
				if (available >= config.conditional_safeguard) {
					available -= config.conditional_safeguard;
				} else {
					// Jeśli nie starcza na safeguard, nie zostawiamy nic (wysyłamy co jest ponad untouchable)
				}
			}

			// Zastosuj globalny limit max_unit_number
			unitsToSendTotal[unit] = Math.min(available, config.max_unit_number);
		}
		this.logger.debug('Total units eligible for sending (after limits):', unitsToSendTotal);

		// 2. Rozdziel jednostki proporcjonalnie na poziomy
		for (const levelStatus of eligibleLevels) {
			const level = levelStatus.level;
			const levelPack = levelPacks[level];
			const plan = dispatchPlan.find(p => p.level === level);
			if (!plan) continue;

			for (const unit of unitOrder) {
				if (!unitsToSendTotal[unit] || unitsToSendTotal[unit] === 0) continue;

				const countForLevel = Math.floor((unitsToSendTotal[unit] * levelPack) / totalPacks);
				plan.dispatchUnits[unit] = countForLevel;
			}
		}

		// 3. Zastosuj limit max_resources dla każdego poziomu osobno
		for (const plan of dispatchPlan) {
			let currentCapacity = 0;
			for (const unit of unitOrder) {
				if (plan.dispatchUnits[unit]) {
					currentCapacity += plan.dispatchUnits[unit] * unitSettings[unit].capacity;
				}
			}

			let levelMaxResources = scavengingSettings.max_resources;
			// Dostosuj max_resources dla poziomu (logika z JS)
			if (eligibleLevels.length === 1) levelMaxResources *= 10;
			else if (eligibleLevels.length === 2) levelMaxResources *= 4;
			else if (eligibleLevels.length === 3) levelMaxResources *= 2;
			else levelMaxResources *= 1.3333;

			if (currentCapacity > levelMaxResources) {
				const ratio = levelMaxResources / currentCapacity;
				this.logger.debug(`Level ${plan.level} capacity ${currentCapacity} exceeds limit ${levelMaxResources}. Applying ratio ${ratio}.`);
				for (const unit of unitOrder) {
					if (plan.dispatchUnits[unit]) {
						plan.dispatchUnits[unit] = Math.floor(plan.dispatchUnits[unit] * ratio);
					}
				}
			}
		}

		// Zwróć tylko plany dla poziomów, które były brane pod uwagę
		return dispatchPlan.filter(p => eligibleLevels.some(el => el.level === p.level));
	}

	/**
	 * Planuje następne uruchomienie procesu zbieractwa.
	 * @param page Instancja strony Playwright do odczytu czasów.
	 * @param fallbackDelaySeconds Opóźnienie w sekundach, jeśli nie uda się odczytać czasów.
	 */
	private async scheduleNextScavengeRun(page: Page, fallbackDelaySeconds: number = 300): Promise<void> {
		let maxRemainingTimeSeconds = 0;
		let successfullyReadTime = false;
		try {
			this.logger.log('Checking active scavenging missions for scheduling...');
			const levelStatuses = await this.getScavengingLevelStatuses(page);
			const busyLevels = levelStatuses.filter(s => s.isBusy);
			const availableLevels = levelStatuses.filter(s => s.isAvailable);

			// Sprawdź, czy są aktywne misje zbieractwa
			if (busyLevels.length > 0) {
				for (const levelStatus of busyLevels) {
					try {
						const timerElement = levelStatus.containerLocator.locator(levelSelectors.levelTimeRemaining);
						this.logger.debug(`Checking time remaining for level ${levelStatus.level} using selector: ${levelSelectors.levelTimeRemaining}`);

						if (await timerElement.isVisible({ timeout: 2000 })) {
							const timeText = await timerElement.textContent({ timeout: 2000 }); // Format HH:MM:SS lub H:MM:SS
							this.logger.debug(`Found time text for level ${levelStatus.level}: "${timeText}"`);

							if (timeText) {
								// Obsługa formatu "H:MM:SS" lub "HH:MM:SS"
								const parts = timeText.trim().split(':').map(Number);
								if (parts.length === 3) {
									const hours = parts[0];
									const minutes = parts[1];
									const seconds = parts[2];
									const remainingSeconds = hours * 3600 + minutes * 60 + seconds;

									this.logger.debug(`Level ${levelStatus.level} time remaining: ${timeText} (${remainingSeconds}s)`);
									maxRemainingTimeSeconds = Math.max(maxRemainingTimeSeconds, remainingSeconds);
									successfullyReadTime = true;
								} else if (parts.length === 2) {
									// Obsługa formatu "MM:SS"
									const minutes = parts[0];
									const seconds = parts[1];
									const remainingSeconds = minutes * 60 + seconds;

									this.logger.debug(`Level ${levelStatus.level} time remaining: ${timeText} (${remainingSeconds}s)`);
									maxRemainingTimeSeconds = Math.max(maxRemainingTimeSeconds, remainingSeconds);
									successfullyReadTime = true;
								} else {
									this.logger.warn(`Invalid time format for level ${levelStatus.level}: ${timeText}`);
								}
							}
						} else {
							this.logger.debug(`Timer element not visible for level ${levelStatus.level}`);
						}
					} catch (timeError) {
						this.logger.warn(`Could not read remaining time for busy level ${levelStatus.level}:`, timeError);
					}
				}
			}
		} catch (statusError) {
			this.logger.error('Error getting level statuses for scheduling:', statusError);
		}

		let delaySeconds: number;
		if (successfullyReadTime && maxRemainingTimeSeconds > 0) {
			delaySeconds = maxRemainingTimeSeconds + scheduleBufferSeconds;
			this.logger.log(`Found max remaining time: ${maxRemainingTimeSeconds}s. Scheduling next run in ${delaySeconds}s.`);
		} else {
			delaySeconds = fallbackDelaySeconds;
			this.logger.log(`Could not determine remaining mission time. Scheduling fallback check in ${delaySeconds}s.`);
		}

		// Użyj setTimeout z `timers/promises`
		await setTimeout(delaySeconds * 1000);
		this.logger.log('Scheduled delay finished. Checking if bot should run again...');

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
}
