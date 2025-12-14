import { ArmyTrainingStrategyResponseDto } from '../../dto/army-training-strategy-response.dto';

/**
 * Mapuje strategię na obiekt z kluczami jednostek
 * @param strategy Strategia treningu jednostek
 * @returns Obiekt z kluczami jednostek i ich wartościami
 */
export function calculateRequestedUnitsByKeyOperation(
    strategy: ArmyTrainingStrategyResponseDto
): Record<string, number> {
    return {
        spear: strategy.spear ?? 0,
        sword: strategy.sword ?? 0,
        axe: strategy.axe ?? 0,
        archer: strategy.archer ?? 0,
        spy: strategy.spy ?? 0,
        light: strategy.light ?? 0,
        marcher: strategy.marcher ?? 0,
        heavy: strategy.heavy ?? 0,
        ram: strategy.ram ?? 0,
        catapult: strategy.catapult ?? 0,
        knight: strategy.knight ?? 0,
        snob: strategy.snob ?? 0,
    };
}



