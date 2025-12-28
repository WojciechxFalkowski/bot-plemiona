import { BrowserContext, Page } from 'playwright';
import { Logger } from '@nestjs/common';
import { PlemionaCookiesService } from '../../plemiona-cookies';
import {
    PlemionaCredentials,
    LoginOptions,
    LoginResult
} from './auth.interfaces';

export class AuthUtils {
    private static logger = new Logger(AuthUtils.name);

    // Constants for Plemiona Login
    private static readonly PLEMIONA_LOGIN_URL = 'https://www.plemiona.pl/';
    private static readonly PLEMIONA_WORLD_SELECTOR = (worldName: string) => `text=${worldName}`;

    /**
     * Adds Plemiona cookies to the browser context.
     * Fetches cookies from the database using PlemionaCookiesService.
     * @param context - The Playwright BrowserContext object.
     * @param plemionaCookiesService - Service to fetch cookies from database
     */
    static async addPlemionaCookies(context: BrowserContext, plemionaCookiesService: PlemionaCookiesService): Promise<void> {
        try {
            // Fetch cookies from plemiona cookies service
            const cookiesData = await plemionaCookiesService.getCookies();

            if (!cookiesData) {
                throw new Error('No Plemiona cookies found in settings');
            }

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
            throw error;
        }
    }

    /**
     * Selects the target world after successful login.
     * @param page - The Playwright Page object
     * @param timeout - Timeout for world selection in milliseconds
     */
    static async selectWorld(page: Page, targetWorld: string, timeout: number = 15000): Promise<void> {
        try {
            this.logger.log(`Attempting to select world: ${targetWorld}`);

            // Check if world selector is visible
            const worldSelectorVisible = await page.isVisible(this.PLEMIONA_WORLD_SELECTOR(targetWorld));

            if (!worldSelectorVisible) {
                throw new Error(`World selector for "${targetWorld}" not visible`);
            }

            const worldWrapper = page.locator('.worlds-container');
            // Click on the world
            await worldWrapper.getByText(targetWorld).click();
            this.logger.log(`Selected world: ${targetWorld}`);

            // Wait for world page to load
            await page.waitForLoadState('networkidle', { timeout });
            
            // Verify we're actually on the game page and not redirected to session_expired
            const currentUrl = page.url();
            if (currentUrl.includes('session_expired')) {
                this.logger.warn('Session expired detected after world selection - cookies are stale');
                throw new Error('SESSION_EXPIRED: Cookies are stale, need to re-login');
            }
            
            // Verify we're on a game page (should contain /game.php or be on the world subdomain)
            if (!currentUrl.includes('/game.php') && !currentUrl.match(/pl\d+\.plemiona\.pl/)) {
                this.logger.warn(`Unexpected URL after world selection: ${currentUrl}`);
                throw new Error(`SESSION_INVALID: Unexpected redirect to ${currentUrl}`);
            }
            
            this.logger.log('World page loaded successfully.');

        } catch (error) {
            this.logger.error(`Error selecting world "${targetWorld}":`, error);
            throw error;
        }
    }

    /**
     * Comprehensive login handler that tries cookies first, then manual login if needed.
     * Also handles world selection.
     * @param page - The Playwright Page object
     * @param credentials - User credentials
     * @param plemionaCookiesService - Service for cookie retrieval
     * @param options - Additional login options
     */
    static async loginAndSelectWorld(
        page: Page,
        credentials: PlemionaCredentials,
        plemionaCookiesService: PlemionaCookiesService,
        serverName: string,
        options: LoginOptions = {}
    ): Promise<LoginResult> {
        const {
            useManualLogin = false,
            skipCookies = false,
            loginTimeout = 15000,
            worldSelectionTimeout = 15000
        } = options;
        // TODO trzeba wywalic serverName
        // TODO trzeba zmienic na serverName z tabeli "servers"

        this.logger.log('Starting comprehensive login and world selection process');

        const result: LoginResult = {
            success: false,
            method: 'cookies',
            worldSelected: false
        };

        try {
            let cookiesAdded = false;

            // Step 1: Try to add cookies (unless skipped or manual login forced)
            if (!skipCookies && !useManualLogin) {
                try {
                    await this.addPlemionaCookies(page.context(), plemionaCookiesService);
                    cookiesAdded = true;
                    this.logger.log('Cookies added successfully');
                } catch (cookieError) {
                    this.logger.warn('Failed to add cookies. Will attempt manual login.', cookieError);
                }
            }

            // Step 2: Navigate to login page
            await page.goto(this.PLEMIONA_LOGIN_URL, { waitUntil: 'networkidle' });
            this.logger.log(`Navigated to ${this.PLEMIONA_LOGIN_URL}`);

            // Step 3: Check if world selector is visible (indicates successful cookie login)
            // Step 3: Check if world selector is visible (indicates successful cookie login)
            const worldWrapper = page.locator('.worlds-container');

            const worldSelector = worldWrapper.getByText(serverName);
            this.logger.log(`serverName: ${serverName}`);
            const worldSelectorVisible = await worldSelector.isVisible();

            if (worldSelectorVisible && cookiesAdded && !useManualLogin) {
                this.logger.log('Login via cookies appears successful (world selector visible).');
                result.method = 'cookies';
            } else {
                this.logger.error('Login failed. World selector not visible after manual login attempt');
                throw new Error('Login failed. World selector not visible after manual login attempt');
            }

            // Step 5: Select the target world
            await this.selectWorld(page, serverName, worldSelectionTimeout);
            result.worldSelected = true;
            result.success = true;

            this.logger.log(`Login and world selection completed successfully using method: ${result.method}`);
            return result;

        } catch (error) {
            const errorMessage = `Login and world selection failed: ${error.message}`;
            this.logger.error(errorMessage, error);
            result.error = errorMessage;
            return result;
        }
    }

    /**
     * Checks if user is currently logged in by looking for specific page elements.
     * @param page - The Playwright Page object
     * @param targetWorld - Expected world name to verify we're on correct world
     */
    static async isLoggedIn(page: Page, targetWorld?: string): Promise<{
        isLoggedIn: boolean;
        isOnCorrectWorld: boolean;
        currentUrl: string;
    }> {
        try {
            const currentUrl = page.url();

            // Check if we're on a game page (contains /game.php)
            const isOnGamePage = currentUrl.includes('/game.php') || currentUrl.includes('plemiona.pl/game');

            // Check if we can see world selector (indicates login page)
            const isOnLoginPage = await page.isVisible('text=Wybierz świat', { timeout: 2000 }).catch(() => false);

            // If target world is specified, check if we're on the correct world
            let isOnCorrectWorld = true;
            if (targetWorld) {
                // Extract world info from URL or page content
                const worldMatch = currentUrl.match(/https:\/\/pl(\d+)\.plemiona\.pl/);
                if (worldMatch) {
                    const worldNumber = worldMatch[1];
                    const expectedWorldNumber = targetWorld.replace('Świat ', '');
                    isOnCorrectWorld = worldNumber === expectedWorldNumber;
                } else {
                    isOnCorrectWorld = false;
                }
            }

            const isLoggedIn = isOnGamePage && !isOnLoginPage;

            this.logger.debug(`Login status check: isLoggedIn=${isLoggedIn}, isOnCorrectWorld=${isOnCorrectWorld}, currentUrl=${currentUrl}`);

            return {
                isLoggedIn,
                isOnCorrectWorld,
                currentUrl
            };

        } catch (error) {
            this.logger.error('Error checking login status:', error);
            return {
                isLoggedIn: false,
                isOnCorrectWorld: false,
                currentUrl: page.url()
            };
        }
    }

    /**
     * Logs out from Plemiona by navigating to logout URL or clicking logout button.
     * @param page - The Playwright Page object
     */
    static async logout(page: Page): Promise<void> {
        try {
            this.logger.log('Starting logout process...');

            // Try to find and click logout link
            const logoutLink = page.locator('a[href*="action=logout"]').first();

            if (await logoutLink.isVisible({ timeout: 5000 })) {
                await logoutLink.click();
                this.logger.log('Clicked logout link');

                // Wait for logout to complete
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                this.logger.log('Logout completed successfully');
            } else {
                // Alternative: navigate directly to logout URL
                const currentUrl = page.url();
                if (currentUrl.includes('plemiona.pl')) {
                    const logoutUrl = currentUrl.split('/game.php')[0] + '/?action=logout';
                    await page.goto(logoutUrl);
                    this.logger.log('Navigated to logout URL');
                } else {
                    this.logger.warn('Could not determine logout method - not on Plemiona domain');
                }
            }

        } catch (error) {
            this.logger.error('Error during logout process:', error);
            throw error;
        }
    }
} 