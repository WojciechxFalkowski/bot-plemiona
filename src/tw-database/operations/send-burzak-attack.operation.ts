import { Page } from 'playwright';
import {
    getAvailableUnitsFromPlaceOperation,
    type UnitCode
} from './get-available-units-from-place.operation';
import { parseBurzakEtykietaOperation } from './parse-burzak-etykieta.operation';
import { selectBurzakUnitsOperation } from './select-burzak-units.operation';
import { fillBurzakAttackUnitsOperation } from './fill-burzak-attack-units.operation';

export interface SendBurzakAttackDependencies {
    page: Page;
    attackRow: Record<string, string>;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

export interface SendBurzakAttackResult {
    success: boolean;
    error?: string;
}

const BUILDING_SELECT_SELECTOR = 'select[name="building"]';

/**
 * Navigates to place URL, parses Burzak etykieta, selects building, fills units, clicks attack and confirms.
 *
 * @param deps - Page (on correct world), attack row, logger
 * @returns Result with success flag and optional error message
 */
export async function sendBurzakAttackOperation(
    deps: SendBurzakAttackDependencies
): Promise<SendBurzakAttackResult> {
    const { page, attackRow, logger } = deps;
    const akcjaUrl = attackRow['AKCJA']?.trim();
    const etykieta = attackRow['ETYKIETA ATAKU'] ?? '';

    if (!akcjaUrl?.startsWith('http')) {
        return { success: false, error: 'Invalid or missing AKCJA URL' };
    }

    const parsed = parseBurzakEtykietaOperation(etykieta);
    if (!parsed) {
        return { success: false, error: `Could not parse Burzak etykieta: ${etykieta}` };
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
        const { units, buildingSelectValue } = selectBurzakUnitsOperation({
            availableUnits: availableUnits as Partial<Record<UnitCode, number>>,
            parsedEtykieta: parsed,
            logger
        });

        await fillBurzakAttackUnitsOperation({
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

        const buildingSelect = page.locator(BUILDING_SELECT_SELECTOR);
        if (await buildingSelect.isVisible({ timeout: 3000 })) {
            await buildingSelect.selectOption(buildingSelectValue);
            logger.log(`Selected building: ${buildingSelectValue}`);
            await page.waitForTimeout(300);
        } else {
            logger.warn(`Building select (${BUILDING_SELECT_SELECTOR}) not visible on confirm step`);
        }

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
        logger.warn(`Send Burzak attack failed: ${msg}`);
        return { success: false, error: msg };
    }
}
