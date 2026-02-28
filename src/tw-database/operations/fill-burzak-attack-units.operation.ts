import { Page } from 'playwright';
import type { UnitCode } from './get-available-units-from-place.operation';

export interface FillBurzakAttackUnitsDependencies {
    page: Page;
    units: Record<string, number>;
    /** Available counts from place page – uses min(requested, available) */
    availableUnits?: Partial<Record<UnitCode, number>>;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

const UNIT_INPUT_SELECTOR = (unitCode: string) => `#unit_input_${unitCode}`;

/**
 * Fills the Plemiona place form with Burzak attack unit counts.
 * Units are pre-validated by selectBurzakUnitsOperation (90% rule).
 * Uses min(requested, available) per unit.
 *
 * @param deps - Page, units to fill, optional availableUnits, logger
 */
export async function fillBurzakAttackUnitsOperation(
    deps: FillBurzakAttackUnitsDependencies
): Promise<void> {
    const { page, units, availableUnits, logger } = deps;

    const formVisible = await page.locator('#command-data-form').isVisible({ timeout: 5000 });
    if (!formVisible) {
        throw new Error('Command form (#command-data-form) not found on place page');
    }

    const unitEntries = Object.entries(units).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0
    );

    const toFill: { unitCode: string; count: number }[] = unitEntries.map(([unitCode, requested]) => {
        const available = availableUnits?.[unitCode as UnitCode] ?? null;
        const count =
            available !== null && available !== undefined ? Math.min(requested, available) : requested;
        return { unitCode, count };
    });

    for (const { unitCode, count } of toFill) {
        const selector = UNIT_INPUT_SELECTOR(unitCode);
        const inputLocator = page.locator(selector);

        if (await inputLocator.isVisible({ timeout: 2000 })) {
            await inputLocator.fill(count.toString());
            await page.waitForTimeout(300);
            logger.log(`Filled Burzak ${unitCode}: ${count}`);
        } else {
            logger.warn(`Input for ${unitCode} not visible (${selector})`);
        }
    }
}
