import { Page } from 'playwright';

const UNIT_CODES = ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'] as const;

export type UnitCode = (typeof UNIT_CODES)[number];

export interface GetAvailableUnitsFromPlaceDependencies {
    page: Page;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

/**
 * Reads available unit counts from the Plemiona place (attack) form.
 * Tries: #units_entry_all_{unit} link text "Wszystkie (123)", then parent row of #unit_input_{unit}.
 *
 * @param deps - Page, logger
 * @returns Map of unitCode -> available count (0 if not found)
 */
export async function getAvailableUnitsFromPlaceOperation(
    deps: GetAvailableUnitsFromPlaceDependencies
): Promise<Partial<Record<UnitCode, number>>> {
    const { page, logger } = deps;
    const result: Partial<Record<UnitCode, number>> = {};

    for (const unitCode of UNIT_CODES) {
        try {
            const allLinkSelector = `#units_entry_all_${unitCode}`;
            const allLink = page.locator(allLinkSelector);
            if (await allLink.isVisible({ timeout: 500 })) {
                const text = await allLink.textContent();
                const match = text?.match(/\((\d+)\)|(\d+)/);
                if (match) {
                    result[unitCode] = parseInt(match[1] ?? match[2] ?? '0', 10);
                    continue;
                }
            }
        } catch {
            /* link not present for this unit (e.g. catapult) */
        }

        try {
            const inputSelector = `#unit_input_${unitCode}`;
            const input = page.locator(inputSelector);
            if (await input.isVisible({ timeout: 500 })) {
                const row = input.locator('xpath=ancestor::tr[1]');
                const rowText = await row.textContent();
                const match = rowText?.match(/\((\d+)\)/);
                if (match) {
                    result[unitCode] = parseInt(match[1], 10);
                } else {
                    result[unitCode] = 0;
                }
            }
        } catch {
            result[unitCode] = 0;
        }
    }

    logger.log(`Available units: ${JSON.stringify(result)}`);
    return result;
}
