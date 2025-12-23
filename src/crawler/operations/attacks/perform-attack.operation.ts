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
    attackType?: 'off' | 'fake' | 'nobleman'; // Detailed attack type for validation
    metadata?: Record<string, unknown>; // Metadata for fake attacks (ram vs catapult)
}

export interface PerformAttackDependencies {
    logger: Logger;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
}

/**
 * Mapuje typ ataku na listę wymaganych jednostek do walidacji
 */
function getRequiredUnitsForAttackType(
    attackType?: 'off' | 'fake' | 'nobleman',
    metadata?: Record<string, unknown>
): string[] {
    if (!attackType) {
        // Domyślnie sprawdź wszystkie jednostki używane w performAttackOperation
        return ['axe', 'light', 'ram', 'snob'];
    }

    switch (attackType) {
        case 'off':
            return ['axe', 'light', 'ram'];
        case 'nobleman':
            return ['axe', 'light', 'ram'];
        case 'fake':
            // Dla fejka sprawdź metadata - jeśli jest informacja o katapultach, użyj catapult, w przeciwnym razie ram
            const useCatapult = metadata?.useCatapult === true || metadata?.catapult !== undefined;
            return useCatapult ? ['axe', 'light', 'catapult'] : ['axe', 'light', 'ram'];
        default:
            return ['axe', 'light', 'ram', 'snob'];
    }
}

/**
 * Mapuje kod jednostki na polską nazwę
 */
function getUnitNamePL(unitCode: string): string {
    const unitNames: Record<string, string> = {
        axe: 'topory',
        light: 'lekka kawaleria',
        ram: 'tarany',
        catapult: 'katapulty',
        snob: 'szlachcice',
    };
    return unitNames[unitCode] || unitCode;
}

/**
 * Mapuje kod jednostki na selektor inputa
 */
function getUnitInputSelector(unitCode: string): string {
    const selectors: Record<string, string> = {
        axe: '#unit_input_axe',
        light: '#unit_input_light',
        ram: '#unit_input_ram',
        catapult: '#unit_input_catapult',
        snob: '#unit_input_snob',
    };
    return selectors[unitCode] || `#unit_input_${unitCode}`;
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
    const { browser, context, page } = await createBrowserPage({ headless: false });

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

            // Określ wymagane jednostki na podstawie typu ataku
            const requiredUnits = getRequiredUnitsForAttackType(config.attackType, config.metadata);
            logger.log(`Required units for attack type ${config.attackType || 'default'}: ${requiredUnits.join(', ')}`);

            // Mapowanie jednostek na linki "all"
            const unitLinks: Record<string, string> = {
                axe: '#units_entry_all_axe',
                light: '#units_entry_all_light',
                ram: '#units_entry_all_ram',
                snob: '#units_entry_all_snob',
            };

            // Kliknij linki "all" tylko dla wymaganych jednostek (jeśli istnieją linki)
            for (const unit of requiredUnits) {
                const linkSelector = unitLinks[unit];
                if (linkSelector) {
                    logger.log(`Adding all ${unit} units...`);
                    const unitLink = page.locator(linkSelector);
                    if (await unitLink.isVisible({ timeout: 5000 })) {
                        await unitLink.click();
                        await page.waitForTimeout(500);
                        logger.log(`✓ All ${unit} units added`);
                    } else {
                        logger.warn(`${unit} units link not found or not visible`);
                    }
                } else if (unit === 'catapult') {
                    // Dla katapult nie ma linka "all", więc pomijamy kliknięcie
                    logger.log(`Catapult units - no "all" link available, will validate input value directly`);
                }
            }

            // Walidacja wartości jednostek przed wysłaniem ataku
            const emptyUnits: string[] = [];
            for (const unit of requiredUnits) {
                const inputSelector = getUnitInputSelector(unit);
                const unitInput = page.locator(inputSelector);
                
                if (await unitInput.isVisible({ timeout: 2000 })) {
                    const inputValue = await unitInput.inputValue();
                    const numericValue = parseInt(inputValue, 10) || 0;
                    
                    if (numericValue === 0) {
                        emptyUnits.push(getUnitNamePL(unit));
                        logger.warn(`Unit ${unit} has zero value`);
                    } else {
                        logger.log(`Unit ${unit} has value: ${numericValue}`);
                    }
                } else {
                    logger.warn(`Input field for ${unit} not found or not visible`);
                    // Jeśli pole nie istnieje, traktujemy to jako błąd
                    emptyUnits.push(getUnitNamePL(unit));
                }
            }

            // Jeśli któraś wymagana jednostka ma wartość 0, rzuć błąd
            if (emptyUnits.length > 0) {
                const errorMessage = `Atak nie może zostać wysłany: następujące jednostki mają wartość zero: ${emptyUnits.join(', ')}`;
                logger.error(errorMessage);
                throw new Error(errorMessage);
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
