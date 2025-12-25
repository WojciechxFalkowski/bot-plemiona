import { ArmyTrainingStrategyResponseDto } from '../../dto/army-training-strategy-response.dto';

export interface GlobalQueueLimits {
    globalQueueCapPerUnit: number;
}

/**
 * Oblicza globalne limity kolejki na podstawie strategii
 * @param strategy Strategia treningu jednostek
 * @returns Obiekt z limitami kolejki
 */
export function calculateGlobalQueueLimitsOperation(
    strategy: ArmyTrainingStrategyResponseDto
): GlobalQueueLimits {
    const globalQueueCapPerUnit = strategy.max_in_queue_per_unit_overall ?? 10;

    return {
        globalQueueCapPerUnit,
    };
}



