import { Page } from 'playwright';
import type { FejkMethodsConfig } from '../interfaces/fejk-methods-config.interface';
import { fillFakeAttackUnitsOperation } from './fill-fake-attack-units.operation';
import {
    getAvailableUnitsFromPlaceOperation,
    type UnitCode
} from './get-available-units-from-place.operation';
import { selectFejkMethodAndUnitsOperation } from './select-fejk-method-and-units.operation';

export interface SendFakeAttackDependencies {
    page: Page;
    attackRow: Record<string, string>;
    fejkConfig: FejkMethodsConfig;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

export interface SendFakeAttackResult {
    success: boolean;
    error?: string;
}

/**
 * Navigates to place URL, checks available units, fills form, clicks attack and confirms.
 *
 * @param deps - Page (on correct world), attack row, logger
 * @returns Result with success flag and optional error message
 */
export async function sendFakeAttackOperation(
    deps: SendFakeAttackDependencies
): Promise<SendFakeAttackResult> {
    const { page, attackRow, fejkConfig, logger } = deps;
    const akcjaUrl = attackRow['AKCJA']?.trim();

    if (!akcjaUrl?.startsWith('http')) {
        return { success: false, error: 'Invalid or missing AKCJA URL' };
    }

    try {
        await page.goto(akcjaUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForTimeout(1000);

        const formExists = await page.locator('#command-data-form').isVisible({ timeout: 5000 });
        if (!formExists) {
            return { success: false, error: 'Command form (#command-data-form) not found' };
        }

        const availableUnits = await getAvailableUnitsFromPlaceOperation({ page, logger });
        const { units } = selectFejkMethodAndUnitsOperation({
            availableUnits: availableUnits as Partial<Record<UnitCode, number>>,
            config: fejkConfig,
            logger
        });
        await fillFakeAttackUnitsOperation({
            page,
            units,
            availableUnits: availableUnits as Partial<Record<UnitCode, number>>,
            logger
        });

        const attackButton = page.locator('#target_attack');
        if (!(await attackButton.isVisible({ timeout: 5000 }))) {
            return { success: false, error: 'Attack button (#target_attack) not visible' };
        }
        await attackButton.click();
        logger.log('Attack button clicked');

        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(1500);

        const confirmButton = page.locator('#troop_confirm_submit');
        if (!(await confirmButton.isVisible({ timeout: 5000 }))) {
            return { success: false, error: 'Confirm button (#troop_confirm_submit) not visible' };
        }
        await confirmButton.click();
        logger.log('Confirm button clicked');

        await page.waitForTimeout(2000);
        return { success: true };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Send fake attack failed: ${msg}`);
        return { success: false, error: msg };
    }
}
