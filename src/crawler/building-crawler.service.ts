import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { chromium, Page, Browser, BrowserContext } from 'playwright';
import { BuildingQueueManager } from '../models/tribal-wars/building-queue-manager';
import { BuildingQueueItem } from '../models/tribal-wars/building-queue-manager';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';
import { SettingsKey } from '../settings/settings-keys.enum';
import { createBrowserPage } from '../utils/browser.utils';

// Interface for Plemiona cookie
interface PlemionaCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
}

@Injectable()
export class BuildingCrawlerService implements OnModuleInit {
    private readonly logger = new Logger(BuildingCrawlerService.name);
    private browser: Browser | null = null;
    private page: Page | null = null;
    private queueManager: BuildingQueueManager | null = null;
    private isRunning = false;
    private timerId: NodeJS.Timeout | null = null;

    // Constants for Plemiona Login
    private readonly PLEMIONA_LOGIN_URL = 'https://www.plemiona.pl/';
    private readonly PLEMIONA_WORLD_SELECTOR = (worldName: string) => `text=${worldName}`;

    // Configuration
    private readonly minIntervalMinutes = 10;
    private readonly maxIntervalMinutes = 15;
    private villageId = '12142'; // Default village ID
    private world = '214'; // Default world

    // Game credentials from environment variables
    private readonly PLEMIONA_USERNAME: string;
    private readonly PLEMIONA_PASSWORD: string;
    private readonly PLEMIONA_TARGET_WORLD: string;

    // Example queue - make it non-readonly so it can be modified
    private exampleQueue: BuildingQueueItem[] = [];

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

    async onModuleInit() {
        this.logger.log('Initializing BuildingCrawlerService');
        // Don't start automatically - will be started by API
    }

    /**
     * Start the building crawler
     * @param options - Browser options
     */
    async start(options?: { headless?: boolean }): Promise<void> {
        this.logger.log(`Starting Plemiona Building Bot for user: ${this.PLEMIONA_USERNAME}`);
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
                    await page.waitForLoadState('networkidle', { timeout: 15000 });
                    this.logger.log('World page loaded.');

                    // --- Start the building process instead of scavenging ---
                    await this.performBuilding(page);

                } catch (worldSelectionOrBuildingError) {
                    this.logger.error(`Error during world selection or building: ${worldSelectionOrBuildingError}`);
                }
            } else {
                this.logger.warn('World selector not visible after login attempt. Cannot proceed to building.');
            }

        } catch (error) {
            this.logger.error(`Error during Plemiona bot operation`, error);
            await page.screenshot({ path: `error_screenshot_${Date.now()}.png`, fullPage: true }).catch(e => this.logger.error('Failed to take screenshot', e));
        } finally {
            this.logger.log('Plemiona Building Bot run finished.');
        }
    }

    /**
     * Performs the building process - initializes the queue manager and processes the building queue
     * @param page - The Playwright page instance
     */
    private async performBuilding(page: Page): Promise<void> {
        this.page = page; // Store the page for later use

        try {
            this.logger.log('Starting building process...');

            // Initialize queue manager
            this.queueManager = new BuildingQueueManager(page, this.villageId);

            // Set the example queue if no queue is defined yet
            this.queueManager.setQueue(this.exampleQueue);

            console.log(await this.queueManager.getAllBuildings());

            // Clean up the queue (remove completed buildings)
            await this.queueManager.cleanQueue();

            this.logger.log('queueManager -> processQueue');
            // Process the queue (try to build the next building)
            const result = await this.queueManager.processQueue();

            if (result) {
                this.logger.log('Successfully queued a building for construction');
            } else {
                this.logger.log('No buildings were queued for construction');
            }

            // Set the service as running
            this.isRunning = true;

            // Schedule the next run
            this.scheduleNextRun();

        } catch (error) {
            this.logger.error('Error during building process:', error);

            // Try to schedule next run even after error
            try {
                this.isRunning = true; // Set as running to allow scheduling
                this.scheduleNextRun(600); // Try again in 10 minutes
            } catch (scheduleError) {
                this.logger.error('Failed to schedule next run after error:', scheduleError);
            }
        }
    }

    /**
     * Stop the building crawler
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            this.logger.warn('BuildingCrawlerService not running');
            return;
        }

        this.logger.log('Stopping BuildingCrawlerService');
        this.isRunning = false;

        // Clear any scheduled runs
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        // Clean up resources
        await this.cleanup();

        this.logger.log('BuildingCrawlerService stopped successfully');
    }

    /**
     * Add Plemiona cookies to the browser context
     * @param context - Browser context to add cookies to
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
            throw error;
        }
    }

    /**
     * Login to Plemiona using username and password
     * @param page - The Playwright Page object
     */
    private async loginToPlemiona(page: Page): Promise<void> {
        try {
            // Fill username and password
            await page.getByRole('textbox', { name: 'Nazwa gracza:' }).fill(this.PLEMIONA_USERNAME);
            this.logger.log('Filled username for manual login.');

            await page.getByRole('textbox', { name: 'Hasło:' }).fill(this.PLEMIONA_PASSWORD);
            this.logger.log('Filled password for manual login.');

            // Click login button
            await page.getByRole('link', { name: 'Logowanie' }).click();
            this.logger.log('Clicked login button for manual login.');

            // Wait for login to complete
            await page.waitForTimeout(3000);
        } catch (error) {
            this.logger.error('Error during manual login steps', error);
            // Rethrow or handle as appropriate
            throw error;
        }
    }

    /**
     * Schedule the next run with a random delay between min and max interval
     * @param fallbackDelaySeconds - Optional fallback delay in seconds
     */
    private scheduleNextRun(fallbackDelaySeconds: number = 300): void {
        // Calculate random delay between minInterval and maxInterval
        const minDelay = this.minIntervalMinutes * 60 * 1000;
        const maxDelay = this.maxIntervalMinutes * 60 * 1000;
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        const minutes = Math.floor(delay / 60000);
        const seconds = Math.floor((delay % 60000) / 1000);

        this.logger.log(`Scheduling next run in ${minutes}m ${seconds}s`);

        this.timerId = setTimeout(() => this.runNextCycle(), delay);
    }

    /**
     * Run the next building cycle
     */
    private async runNextCycle(): Promise<void> {
        if (!this.isRunning) {
            this.logger.log('Service is no longer running, skipping next cycle');
            return;
        }

        this.logger.log('Starting next building cycle...');

        try {
            // Create a new browser and page for this cycle
            const { browser, context, page } = await createBrowserPage({ headless: true });
            this.browser = browser;
            this.page = page;

            // Authenticate
            try {
                await this.addPlemionaCookies(context);
                await page.goto(`https://pl${this.PLEMIONA_TARGET_WORLD}.plemiona.pl/game.php?village=${this.villageId}&screen=main`, { waitUntil: 'networkidle' });

                // Check if logged in
                if (!(await page.isVisible('#menu_row'))) {
                    // Cookies failed, go to login page
                    await page.goto(this.PLEMIONA_LOGIN_URL, { waitUntil: 'networkidle' });
                    await this.loginToPlemiona(page);

                    // Select world
                    if (await page.isVisible(this.PLEMIONA_WORLD_SELECTOR(this.PLEMIONA_TARGET_WORLD))) {
                        await page.getByText(this.PLEMIONA_TARGET_WORLD).click();
                        await page.waitForLoadState('networkidle', { timeout: 15000 });

                        // Navigate to main building screen
                        await page.goto(`https://pl${this.PLEMIONA_TARGET_WORLD}.plemiona.pl/game.php?village=${this.villageId}&screen=main`, { waitUntil: 'networkidle' });
                    } else {
                        throw new Error('World selector not visible after login');
                    }
                }

                // Initialize queue manager
                this.queueManager = new BuildingQueueManager(page, this.villageId);

                // Clean up the queue
                await this.queueManager.cleanQueue();

                // Process queue
                const result = await this.queueManager.processQueue();
                if (result) {
                    this.logger.log('Successfully queued a building for construction');
                } else {
                    this.logger.log('No buildings were queued for construction');
                }

                // Schedule next run
                this.scheduleNextRun();

            } catch (error) {
                this.logger.error('Error during building cycle:', error);
                this.scheduleNextRun(600); // Try again in 10 minutes
            } finally {
                // Clean up browser
                await this.cleanup();
            }

        } catch (error) {
            this.logger.error('Failed to initialize browser for next cycle:', error);
            this.scheduleNextRun(600); // Try again in 10 minutes
        }
    }

    /**
     * Clean up resources
     */
    private async cleanup(): Promise<void> {
        this.logger.log('Cleaning up resources');

        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }

        this.page = null;
        this.queueManager = null;

        this.logger.log('Resources cleaned up');
    }

    /**
     * Get the current building queue
     */
    getQueue(): BuildingQueueItem[] {
        if (!this.queueManager) {
            return [...this.exampleQueue]; // Return a copy of example queue
        }

        return this.queueManager.getQueue();
    }

    /**
     * Set the building queue
     * @param queue - The new queue to set
     */
    setQueue(queue: BuildingQueueItem[]): void {
        if (this.queueManager) {
            this.queueManager.setQueue(queue);
            this.logger.log('Building queue updated');
        } else {
            // Store for next initialization
            this.exampleQueue = [...queue];
            this.logger.log('Stored queue for next initialization');
        }
    }

    /**
     * Add a building to the queue
     * @param buildingId - ID of the building
     * @param level - Target level
     * @param priority - Priority (lower = higher priority)
     */
    addToQueue(buildingId: string, level: number, priority: number): void {
        if (this.queueManager) {
            this.queueManager.addToQueue(buildingId, level, priority);
            this.logger.log(`Added building ${buildingId} level ${level} to queue with priority ${priority}`);
        } else {
            // Add to example queue
            const existingIndex = this.exampleQueue.findIndex(
                item => item.buildingId === buildingId && item.level === level
            );

            if (existingIndex >= 0) {
                this.exampleQueue[existingIndex].priority = priority;
            } else {
                this.exampleQueue.push({ buildingId, level, priority });
            }

            // Sort by priority
            this.exampleQueue.sort((a, b) => a.priority - b.priority);
            this.logger.log(`Added building ${buildingId} level ${level} to stored queue with priority ${priority}`);
        }
    }

    /**
     * Remove a building from the queue
     * @param buildingId - ID of the building
     * @param level - Target level
     */
    removeFromQueue(buildingId: string, level: number): void {
        if (this.queueManager) {
            this.queueManager.removeFromQueue(buildingId, level);
            this.logger.log(`Removed building ${buildingId} level ${level} from queue`);
        } else {
            // Remove from example queue
            this.exampleQueue = this.exampleQueue.filter(
                item => !(item.buildingId === buildingId && item.level === level)
            );
            this.logger.log(`Removed building ${buildingId} level ${level} from stored queue`);
        }
    }

    /**
     * Check if the crawler is running
     */
    isActive(): boolean {
        return this.isRunning;
    }
} 