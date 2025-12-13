import { ArmyTrainingStrategyResponseDto } from '../../dto/army-training-strategy-response.dto';
import { UnitDefinition } from '@/utils/army/armyPage/unitDefinitions';

export interface GlobalQueueLimits {
    remainingByMaxTotal: number;
    globalQueueCapPerUnit: number;
}

/**
 * Oblicza globalne limity kolejki na podstawie stanu jednostek
 * @param unitsInProduction Jednostki w produkcji
 * @param strategy Strategia treningu jednostek
 * @returns Obiekt z limitami kolejki
 */
export function calculateGlobalQueueLimitsOperation(
    unitsInProduction: ReadonlyArray<UnitDefinition>,
    strategy: ArmyTrainingStrategyResponseDto
): GlobalQueueLimits {
    const remainingByMaxTotal = Math.max(0, (strategy.max_total_overall ?? Number.POSITIVE_INFINITY) -
        unitsInProduction.reduce((sum, u) => sum + (u.dynamicData?.unitsTotal ?? 0) + (u.dynamicData?.unitsInQueue ?? 0), 0));
    const globalQueueCapPerUnit = strategy.max_in_queue_per_unit_overall ?? 10;

    return {
        remainingByMaxTotal,
        globalQueueCapPerUnit,
    };
}


