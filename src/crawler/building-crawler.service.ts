import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { chromium, Page, Browser, BrowserContext } from 'playwright';
import { BuildingQueueManager } from '../models/tribal-wars/building-queue-manager';
import { BuildingQueueItem } from '../models/tribal-wars/building-queue-manager';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';
import { SettingsKey } from '../settings/settings-keys.enum';
import { createBrowserPage } from '../utils/browser.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { ServersService } from '@/servers';
import { PlemionaCookiesService } from '@/plemiona-cookies';

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
    private readonly credentials: PlemionaCredentials;
    // Example queue - make it non-readonly so it can be modified
    private exampleQueue: BuildingQueueItem[] = [];

    constructor(
        private settingsService: SettingsService,
        private configService: ConfigService,
        private serversService: ServersService,
        private plemionaCookiesService: PlemionaCookiesService
    ) {
        // Initialize credentials from environment variables with default values if not set
        this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);

        // Check for missing credentials
        const missingCredentials: string[] = [];
        if (!this.credentials.username) missingCredentials.push('PLEMIONA_USERNAME');
        if (!this.credentials.password) missingCredentials.push('PLEMIONA_PASSWORD');
        if (!this.credentials.targetWorld) missingCredentials.push('PLEMIONA_TARGET_WORLD');

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
    async start(serverId: number, options?: { headless?: boolean }): Promise<void> {
        this.logger.log(`Starting Plemiona Building Bot for user: ${this.credentials.username}`);
        const { browser, context, page } = await createBrowserPage(options);

        try {
            let cookiesAdded = false;
            try {
                await this.addPlemionaCookies(context, serverId);
                cookiesAdded = true;
            } catch (cookieError) {
                this.logger.warn('Failed to add cookies. Will attempt manual login.', cookieError);
                // Continue with manual login
            }

            await page.goto(this.PLEMIONA_LOGIN_URL, { waitUntil: 'networkidle' });
            this.logger.log(`Navigated to ${this.PLEMIONA_LOGIN_URL}`);

            const server = await this.serversService.findById(serverId);
            const worldSelectorVisible = await page.isVisible(this.PLEMIONA_WORLD_SELECTOR(server.serverName));

            if (worldSelectorVisible && cookiesAdded) {
                this.logger.log('Login via cookies appears successful (world selector visible).');
            } else {
                this.logger.log('World selector not immediately visible, attempting manual login.');
                await AuthUtils.loginToPlemiona(page, this.credentials); // Fallback to manual login
                this.logger.log('Manual login attempted.');
            }

            // --- World Selection ---
            if (await page.isVisible(this.PLEMIONA_WORLD_SELECTOR(this.credentials.targetWorld))) {
                try {
                    await page.getByText(this.credentials.targetWorld).click();
                    this.logger.log(`Selected world: ${this.credentials.targetWorld}`);
                    await page.waitForLoadState('networkidle', { timeout: 15000 });
                    this.logger.log('World page loaded.');

                    // --- Start the building process instead of scavenging ---
                    await this.performBuilding(page, serverId);

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
    private async performBuilding(page: Page, serverId: number): Promise<void> {
        this.page = page; // Store the page for later use

        try {
            this.logger.log('Starting building process...');

            if (this.exampleQueue.length === 0) {
                this.logger.log('No buildings to build. Exiting.');
                return;
            }
            // Initialize queue manager
            this.queueManager = new BuildingQueueManager(page, this.villageId);

            // Set the example queue if no queue is defined yet
            this.queueManager.setQueue(this.exampleQueue);

            console.log(await this.queueManager.getAllBuildings());

            // Clean up the queue (remove completed buildings)
            await this.queueManager.cleanQueue();

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
            this.scheduleNextRun(serverId);

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
    private async addPlemionaCookies(context: BrowserContext, serverId: number): Promise<void> {
        try {
            // Fetch cookies from plemiona cookies service
            const cookiesData = await this.plemionaCookiesService.getCookies();

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
     * Schedule the next run with a random delay between min and max interval
     * @param fallbackDelaySeconds - Optional fallback delay in seconds
     */
    private scheduleNextRun(serverId: number, fallbackDelaySeconds: number = 300): void {
        // Calculate random delay between minInterval and maxInterval
        const minDelay = this.minIntervalMinutes * 60 * 1000;
        const maxDelay = this.maxIntervalMinutes * 60 * 1000;
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        const minutes = Math.floor(delay / 60000);
        const seconds = Math.floor((delay % 60000) / 1000);

        this.logger.log(`Scheduling next run in ${minutes}m ${seconds}s`);

        this.timerId = setTimeout(() => this.start(serverId), delay);//delay
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