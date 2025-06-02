import { BrowserContext, Page } from 'playwright';
import { Logger } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { SettingsKey } from '../../settings/settings-keys.enum';
import {
    PlemionaCookie,
    PlemionaCredentials,
    LoginOptions,
    LoginResult
} from './auth.interfaces';

export class AuthUtils {
    private static logger = new Logger(AuthUtils.name);

    // Constants for Plemiona Login
    private static readonly PLEMIONA_LOGIN_URL = 'https://www.plemiona.pl/';
    private static readonly PLEMIONA_USERNAME_SELECTOR = 'textbox[name="Nazwa gracza:"]';
    private static readonly PLEMIONA_PASSWORD_SELECTOR = 'textbox[name="Hasło:"]';
    private static readonly PLEMIONA_LOGIN_BUTTON_SELECTOR = 'link[name="Logowanie"]';
    private static readonly PLEMIONA_WORLD_SELECTOR = (worldName: string) => `text=${worldName}`;

    /**
     * Adds Plemiona cookies to the browser context.
     * Fetches cookies from the database using SettingsService.
     * @param context - The Playwright BrowserContext object.
     * @param settingsService - Service to fetch cookies from database
     */
    static async addPlemionaCookies(context: BrowserContext, settingsService: SettingsService): Promise<void> {
        try {
            // Fetch cookies from settings
            const cookiesData = await settingsService.getSetting<PlemionaCookie[]>(SettingsKey.PLEMIONA_COOKIES);

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
            throw error;
        }
    }

    /**
     * Performs manual login to Plemiona by filling credentials form.
     * @param page - The Playwright Page object.
     * @param credentials - User credentials for login
     */
    static async loginToPlemiona(page: Page, credentials: PlemionaCredentials): Promise<void> {
        try {
            this.logger.log('Starting manual login process...');

            // Fill Username
            await page.getByRole('textbox', { name: 'Nazwa gracza:' }).fill(credentials.username);
            this.logger.log('Filled username for manual login.');

            // Fill Password
            await page.getByRole('textbox', { name: 'Hasło:' }).fill(credentials.password);
            this.logger.log('Filled password for manual login.');

            // Click Login
            await page.getByRole('link', { name: 'Logowanie' }).click();
            this.logger.log('Clicked login button for manual login.');

            // Wait for potential page load/redirect after login click
            await page.waitForTimeout(3000);
            this.logger.log('Manual login process completed.');

        } catch (error) {
            this.logger.error('Error during manual login steps', error);
            throw error;
        }
    }

    /**
     * Selects the target world after successful login.
     * @param page - The Playwright Page object
     * @param targetWorld - Name of the world to select (e.g., "Świat 214")
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

            // Click on the world
            await page.getByText(targetWorld).click();
            this.logger.log(`Selected world: ${targetWorld}`);

            // Wait for world page to load
            await page.waitForLoadState('networkidle', { timeout });
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
     * @param settingsService - Settings service for cookie retrieval
     * @param options - Additional login options
     */
    static async loginAndSelectWorld(
        page: Page,
        credentials: PlemionaCredentials,
        settingsService: SettingsService,
        options: LoginOptions = {}
    ): Promise<LoginResult> {
        const {
            useManualLogin = false,
            skipCookies = false,
            loginTimeout = 15000,
            worldSelectionTimeout = 15000
        } = options;

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
                    await this.addPlemionaCookies(page.context(), settingsService);
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
            const worldSelectorVisible = await page.isVisible(
                this.PLEMIONA_WORLD_SELECTOR(credentials.targetWorld),
                { timeout: 5000 }
            );

            if (worldSelectorVisible && cookiesAdded && !useManualLogin) {
                this.logger.log('Login via cookies appears successful (world selector visible).');
                result.method = 'cookies';
            } else {
                // Step 4: Perform manual login if cookies failed or manual login requested
                this.logger.log('World selector not immediately visible or manual login requested, attempting manual login.');
                await this.loginToPlemiona(page, credentials);
                result.method = cookiesAdded ? 'mixed' : 'manual';

                // Wait a bit and check again for world selector
                await page.waitForTimeout(2000);
                const worldSelectorVisibleAfterLogin = await page.isVisible(
                    this.PLEMIONA_WORLD_SELECTOR(credentials.targetWorld),
                    { timeout: 5000 }
                );

                if (!worldSelectorVisibleAfterLogin) {
                    throw new Error('World selector not visible after manual login attempt');
                }
            }

            // Step 5: Select the target world
            await this.selectWorld(page, credentials.targetWorld, worldSelectionTimeout);
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
     * Validates if the provided credentials are complete and valid.
     * @param credentials - Credentials to validate
     * @returns Object with validation result and missing fields
     */
    static validateCredentials(credentials: PlemionaCredentials): {
        isValid: boolean;
        missingFields: string[];
        errors: string[];
    } {
        const missingFields: string[] = [];
        const errors: string[] = [];

        // Check for missing fields
        if (!credentials.username || credentials.username.trim() === '') {
            missingFields.push('username');
        }
        if (!credentials.password || credentials.password.trim() === '') {
            missingFields.push('password');
        }
        if (!credentials.targetWorld || credentials.targetWorld.trim() === '') {
            missingFields.push('targetWorld');
        }

        // Additional validation rules
        if (credentials.username && credentials.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }
        if (credentials.password && credentials.password.length < 5) {
            errors.push('Password must be at least 5 characters long');
        }
        if (credentials.targetWorld && !credentials.targetWorld.includes('Świat')) {
            errors.push('Target world should be in format "Świat XXX"');
        }

        const isValid = missingFields.length === 0 && errors.length === 0;

        return {
            isValid,
            missingFields,
            errors
        };
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