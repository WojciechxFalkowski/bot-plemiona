import { Logger } from '@nestjs/common';
import { Page, Browser, BrowserContext } from 'playwright';
import { createBrowserPage } from '../../../utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';

export interface AttackConfig {
    id: string;           // Village identifier (e.g., "0005")
    link: string;         // Attack/Support URL
    scheduleTime: number; // Time in minutes (e.g., 180 for 3 hours, 370 for 6 hours 10 minutes)
    marchTime: number;    // March time in minutes (how long troops take to reach target)
    type: 'attack' | 'support'; // Type of action: 'attack' or 'support'
}

export interface PerformAttackDependencies {
    logger: Logger;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
}

/**
 * Performs an attack by logging in, navigating to attack page, selecting units and attacking
 * @param config Attack configuration
 * @param serverName Server name
 * @param deps Dependencies needed for attack execution
 */
export async function performAttackOperation(
    config: AttackConfig,
    serverName: string,
    deps: PerformAttackDependencies
): Promise<void> {
    const { logger, credentials, plemionaCookiesService } = deps;

    logger.log(`Starting attack sequence for village ${config.id}...`);
    const { browser, context, page } = await createBrowserPage({ headless: true });

    try {
        // Use AuthUtils for login and world selection
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            credentials,
            plemionaCookiesService,
            serverName
        );

        if (loginResult.success && loginResult.worldSelected) {
            logger.log(`Login successful using method: ${loginResult.method}`);

            // Navigate to the specific attack page
            const attackUrl = config.link;
            logger.log(`Navigating to attack page for village ${config.id}: ${attackUrl}`);
            await page.goto(attackUrl, { waitUntil: 'networkidle', timeout: 15000 });

            // Wait for page to load completely
            await page.waitForTimeout(2000);

            // Click on units_entry_all_axe to add all axe units
            logger.log('Adding all axe units...');
            const axeLink = page.locator('#units_entry_all_axe');
            if (await axeLink.isVisible({ timeout: 5000 })) {
                await axeLink.click();
                await page.waitForTimeout(500);
                logger.log('✓ All axe units added');
            } else {
                logger.warn('Axe units link not found or not visible');
            }

            // Click on units_entry_all_light to add all light cavalry units
            logger.log('Adding all light cavalry units...');
            const lightLink = page.locator('#units_entry_all_light');
            if (await lightLink.isVisible({ timeout: 5000 })) {
                await lightLink.click();
                await page.waitForTimeout(500);
                logger.log('✓ All light cavalry units added');
            } else {
                logger.warn('Light cavalry units link not found or not visible');
            }

            // Click on units_entry_all_ram to add all ram units
            logger.log('Adding all ram units...');
            const ramLink = page.locator('#units_entry_all_ram');
            if (await ramLink.isVisible({ timeout: 5000 })) {
                await ramLink.click();
                await page.waitForTimeout(500);
                logger.log('✓ All ram units added');
            } else {
                logger.warn('Ram units link not found or not visible');
            }

            // Click on units_entry_all_snob to add all snob units
            logger.log('Adding all snob units...');
            const snobLink = page.locator('#units_entry_all_snob');
            if (await snobLink.isVisible({ timeout: 5000 })) {
                await snobLink.click();
                await page.waitForTimeout(500);
                logger.log('✓ All snob units added');
            } else {
                logger.warn('Snob units link not found or not visible');
            }

            // Click the attack button
            logger.log('Clicking attack button...');
            const attackButton = page.locator('#target_attack');
            if (await attackButton.isVisible({ timeout: 5000 })) {
                await attackButton.click();
                logger.log('✓ Attack button clicked successfully');

                // Wait for the confirmation page to load
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                await page.waitForTimeout(2000);
                logger.log('Confirmation page loaded');

                // Click the confirmation button
                logger.log('Clicking confirmation button...');
                const confirmButton = page.locator('#troop_confirm_submit');
                if (await confirmButton.isVisible({ timeout: 5000 })) {
                    await confirmButton.click();
                    logger.log('✓ Confirmation button clicked successfully');

                    // Wait a bit to see the final result
                    await page.waitForTimeout(3000);
                    logger.log(`Attack sequence completed successfully for village ${config.id}`);
                } else {
                    logger.warn('Confirmation button not found or not visible');
                }
            } else {
                logger.warn('Attack button not found or not visible');
            }

        } else {
            logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
        }

    } catch (error) {
        logger.error(`Error during attack sequence for village ${config.id}:`, error);
        await page.screenshot({
            path: `attack_error_screenshot_${Date.now()}.png`,
            fullPage: true
        }).catch(e => logger.error('Failed to take error screenshot', e));
        throw error;
    } finally {
        // Close browser
        await browser.close();
        logger.log(`Attack sequence finished for village ${config.id} - browser closed`);
    }
}
