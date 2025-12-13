import { Logger } from '@nestjs/common';
import { UnitDefinition } from '@/utils/army/armyPage/unitDefinitions';

export interface ValidateLightUnitCanTrainDependencies {
    logger: Logger;
}

export interface ValidateLightUnitCanTrainResult {
    canTrain: boolean;
    error?: string;
}

/**
 * Waliduje czy lekka jednostka może być trenowana
 * @param lightUnit Definicja lekkiej jednostki
 * @param maxRecruitment Maksymalna liczba jednostek do zrekrutowania
 * @param maxInQueue Maksymalna liczba jednostek w kolejce
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik walidacji
 */
export function validateLightUnitCanTrainOperation(
    lightUnit: UnitDefinition | undefined,
    maxRecruitment: number,
    maxInQueue: number,
    deps: ValidateLightUnitCanTrainDependencies
): ValidateLightUnitCanTrainResult {
    const { logger } = deps;

    if (!lightUnit || !lightUnit.dynamicData.canRecruit) {
        logger.error('❌Light unit not found');
        return { canTrain: false, error: 'Light unit not found or cannot recruit' };
    }

    if (!lightUnit.dynamicData.producibleCount || lightUnit.dynamicData.producibleCount < maxRecruitment) {
        logger.error(`❌Light unit cannot recruit ${maxRecruitment} units`);
        return { canTrain: false, error: `Light unit cannot recruit ${maxRecruitment} units` };
    }

    if (lightUnit.dynamicData.unitsInQueue && lightUnit.dynamicData.unitsInQueue > maxInQueue) {
        logger.error(`❌Light unit cannot recruit more than ${maxInQueue} units in queue`);
        return { canTrain: false, error: `Light unit cannot recruit more than ${maxInQueue} units in queue` };
    }

    return { canTrain: true };
}


