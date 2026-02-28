import type { FejkMethodsConfig, FejkMethodConfig } from '../interfaces/fejk-methods-config.interface';
import type { UnitCode } from './get-available-units-from-place.operation';

export interface SelectFejkMethodAndUnitsDependencies {
    availableUnits: Partial<Record<UnitCode, number>>;
    config: FejkMethodsConfig;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

export interface SelectFejkMethodAndUnitsResult {
    units: Record<string, number>;
    methodUsed: 1 | 2;
}

const MIN_SCOUTS_PER_FEJK = 5;

function getAvailable(availableUnits: Partial<Record<UnitCode, number>>, unit: string): number {
    return availableUnits[unit as UnitCode] ?? 0;
}

function resolveSiege(
    methodConfig: FejkMethodConfig,
    availableUnits: Partial<Record<UnitCode, number>>
): string | null {
    const siegeCount = methodConfig.units['siege'];
    if (siegeCount == null || siegeCount <= 0) return null;
    for (const siegeUnit of methodConfig.siegeUnits) {
        const available = getAvailable(availableUnits, siegeUnit);
        if (available >= siegeCount) return siegeUnit;
    }
    return null;
}

function buildUnits(
    methodConfig: FejkMethodConfig,
    siegeResolved: string | null,
    availableUnits: Partial<Record<UnitCode, number>>
): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [unitCode, requested] of Object.entries(methodConfig.units)) {
        if (unitCode === 'siege') {
            if (siegeResolved) result[siegeResolved] = requested;
            continue;
        }
        const available = getAvailable(availableUnits, unitCode);
        if (available < requested) {
            throw new Error(`${unitCode}: need ${requested}, have ${available}`);
        }
        result[unitCode] = requested;
    }
    return result;
}

/**
 * Selects fejk method based on available units and resolves siege (ram/catapult).
 * Method 1 if spy >= minSpyInVillage, else Method 2.
 */
export function selectFejkMethodAndUnitsOperation(
    deps: SelectFejkMethodAndUnitsDependencies
): SelectFejkMethodAndUnitsResult {
    const { availableUnits, config, logger } = deps;
    const spyAvailable = getAvailable(availableUnits, 'spy');
    const minSpy = config.method1.minSpyInVillage ?? 500;

    let methodConfig: FejkMethodConfig;
    let methodUsed: 1 | 2;

    if (spyAvailable >= minSpy) {
        methodConfig = config.method1;
        methodUsed = 1;
        logger.log(`Using method 1 (spy): spy=${spyAvailable} >= ${minSpy}`);
    } else {
        methodConfig = config.method2;
        methodUsed = 2;
        logger.log(`Using method 2 (off): spy=${spyAvailable} < ${minSpy}`);
    }

    const siegeResolved = resolveSiege(methodConfig, availableUnits);
    if (methodConfig.units['siege'] != null && methodConfig.units['siege'] > 0 && !siegeResolved) {
        throw new Error('Brak taranów i katapult – nie można wysłać fejka');
    }

    const units = buildUnits(methodConfig, siegeResolved, availableUnits);
    const currentSpy = units.spy ?? 0;
    if (currentSpy < MIN_SCOUTS_PER_FEJK) {
        const availableSpy = getAvailable(availableUnits, 'spy');
        const toAdd = Math.min(MIN_SCOUTS_PER_FEJK - currentSpy, availableSpy);
        if (toAdd > 0) units.spy = currentSpy + toAdd;
    }
    logger.log(`Selected units: ${JSON.stringify(units)}`);
    return { units, methodUsed };
}
