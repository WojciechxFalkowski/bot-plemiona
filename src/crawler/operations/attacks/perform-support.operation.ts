import { Logger } from '@nestjs/common';
import { Page, Browser, BrowserContext } from 'playwright';
import { createBrowserPage } from '../../../utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { AttackConfig } from './perform-attack.operation';

export interface PerformSupportDependencies {
    logger: Logger;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
}

/**
 * Performs a support action by logging in, navigating to support page, selecting units and sending support
 * @param config Support configuration (uses AttackConfig interface)
 * @param serverName Server name
 * @param deps Dependencies needed for support execution
 */
export async function performSupportOperation(
    config: AttackConfig,
    serverName: string,
    deps: PerformSupportDependencies
): Promise<void> {
    const { logger, credentials, plemionaCookiesService } = deps;

    logger.log(`Starting support sequence for village ${config.id}...`);
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

            // Navigate to the specific support page (same as attack page)
            const supportUrl = config.link;
            logger.log(`Navigating to support page for village ${config.id}: ${supportUrl}`);
            await page.goto(supportUrl, { waitUntil: 'networkidle', timeout: 15000 });

            // Wait for page to load completely
            await page.waitForTimeout(2000);

            // Click on units_entry_all_spear to add all spear units
            logger.log('Adding all spear units...');
            const spearLink = page.locator('#units_entry_all_spear');
            if (await spearLink.isVisible({ timeout: 5000 })) {
                await spearLink.click();
                await page.waitForTimeout(500);
                logger.log('✓ All spear units added');
            } else {
                logger.warn('Spear units link not found or not visible');
            }

            // Click on units_entry_all_sword to add all sword units
            logger.log('Adding all sword units...');
            const swordLink = page.locator('#units_entry_all_sword');
            if (await swordLink.isVisible({ timeout: 5000 })) {
                await swordLink.click();
                await page.waitForTimeout(500);
                logger.log('✓ All sword units added');
            } else {
                logger.warn('Sword units link not found or not visible');
            }

            // Click on units_entry_all_archer to add all archer units
            logger.log('Adding all archer units...');
            const archerLink = page.locator('#units_entry_all_archer');
            if (await archerLink.isVisible({ timeout: 5000 })) {
                await archerLink.click();
                await page.waitForTimeout(500);
                logger.log('✓ All archer units added');
            } else {
                logger.warn('Archer units link not found or not visible');
            }

            // Click the support button
            logger.log('Clicking support button...');
            const supportButton = page.locator('#target_support');
            if (await supportButton.isVisible({ timeout: 5000 })) {
                await supportButton.click();
                logger.log('✓ Support button clicked successfully');

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
                    logger.log(`Support sequence completed successfully for village ${config.id}`);
                } else {
                    logger.warn('Confirmation button not found or not visible');
                }
            } else {
                logger.warn('Support button not found or not visible');
            }

        } else {
            logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
        }

    } catch (error) {
        logger.error(`Error during support sequence for village ${config.id}:`, error);
        await page.screenshot({
            path: `support_error_screenshot_${Date.now()}.png`,
            fullPage: true
        }).catch(e => logger.error('Failed to take error screenshot', e));
        throw error;
    } finally {
        // Close browser
        await browser.close();
        logger.log(`Support sequence finished for village ${config.id} - browser closed`);
    }
}
