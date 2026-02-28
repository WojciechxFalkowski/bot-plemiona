import type { UnitCode } from './get-available-units-from-place.operation';
import type { ParseBurzakEtykietaResult } from './parse-burzak-etykieta.operation';

const MIN_ACCEPTABLE_PERCENT = 0.9;
const MIN_SCOUTS_BURZAK = 5;

export interface SelectBurzakUnitsDependencies {
    availableUnits: Partial<Record<UnitCode, number>>;
    parsedEtykieta: ParseBurzakEtykietaResult;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

export interface SelectBurzakUnitsResult {
    units: Record<string, number>;
    buildingSelectValue: string;
}

function getAvailable(availableUnits: Partial<Record<UnitCode, number>>, unit: UnitCode): number {
    return availableUnits[unit] ?? 0;
}

/**
 * Selects units for Burzak attack: catapult, axe (same count), spy (up to 5, optional).
 * Uses 90% rule: if 200 requested, min 180 acceptable.
 *
 * @param deps - Available units, parsed etykieta, logger
 * @returns Units to send and building select value
 * @throws Error when catapult or axe below 90% of requested
 */
export function selectBurzakUnitsOperation(deps: SelectBurzakUnitsDependencies): SelectBurzakUnitsResult {
    const { availableUnits, parsedEtykieta, logger } = deps;
    const { catapultCount, buildingSelectValue } = parsedEtykieta;

    const minAcceptable = Math.floor(catapultCount * MIN_ACCEPTABLE_PERCENT);
    const availableCatapult = getAvailable(availableUnits, 'catapult');
    const availableAxe = getAvailable(availableUnits, 'axe');

    if (availableCatapult < minAcceptable) {
        throw new Error(
            `catapult: need ${minAcceptable}+ (90% of ${catapultCount}), have ${availableCatapult}`
        );
    }
    if (availableAxe < minAcceptable) {
        throw new Error(`axe: need ${minAcceptable}+ (90% of ${catapultCount}), have ${availableAxe}`);
    }

    const toSendCatapult = Math.min(catapultCount, availableCatapult);
    const toSendAxe = Math.min(catapultCount, availableAxe);
    const availableSpy = getAvailable(availableUnits, 'spy');
    const toSendSpy = Math.min(MIN_SCOUTS_BURZAK, availableSpy);

    const units: Record<string, number> = {
        catapult: toSendCatapult,
        axe: toSendAxe
    };
    if (toSendSpy > 0) units.spy = toSendSpy;

    logger.log(`Selected Burzak units: ${JSON.stringify(units)}, building=${buildingSelectValue}`);
    return { units, buildingSelectValue };
}
