import { Page } from 'playwright';
import type { UnitCode } from './get-available-units-from-place.operation';

export interface FillFakeAttackUnitsDependencies {
    page: Page;
    units: Record<string, number>;
    /** Available counts from place page – if missing, fills without validation */
    availableUnits?: Partial<Record<UnitCode, number>>;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

const UNIT_INPUT_SELECTOR = (unitCode: string) => `#unit_input_${unitCode}`;

/**
 * Fills the Plemiona place form with fake attack unit counts.
 * If availableUnits provided: uses min(requested, available) and fails if any required unit is unavailable.
 *
 * @param deps - Page, units to fill, optional availableUnits, logger
 */
export async function fillFakeAttackUnitsOperation(
    deps: FillFakeAttackUnitsDependencies
): Promise<void> {
    const { page, units, availableUnits, logger } = deps;

    const formVisible = await page.locator('#command-data-form').isVisible({ timeout: 5000 });
    if (!formVisible) {
        throw new Error('Command form (#command-data-form) not found on place page');
    }

    const unitEntries = Object.entries(units).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0
    );

    const missing: string[] = [];
    const toFill: { unitCode: string; count: number }[] = [];

    for (const [unitCode, requested] of unitEntries) {
        const available = availableUnits?.[unitCode as UnitCode] ?? null;
        if (available !== null && available !== undefined) {
            if (available < requested) {
                missing.push(`${unitCode}: need ${requested}, have ${available}`);
            }
            toFill.push({ unitCode, count: Math.min(requested, available) });
        } else {
            toFill.push({ unitCode, count: requested });
        }
    }

    if (missing.length > 0) {
        throw new Error(`Brakujące jednostki: ${missing.join('; ')}`);
    }

    for (const { unitCode, count } of toFill) {
        const selector = UNIT_INPUT_SELECTOR(unitCode);
        const inputLocator = page.locator(selector);

        if (await inputLocator.isVisible({ timeout: 2000 })) {
            await inputLocator.fill(count.toString());
            await page.waitForTimeout(300);
            logger.log(`Filled ${unitCode}: ${count}`);
        } else {
            logger.warn(`Input for ${unitCode} not visible (${selector})`);
        }
    }
}
