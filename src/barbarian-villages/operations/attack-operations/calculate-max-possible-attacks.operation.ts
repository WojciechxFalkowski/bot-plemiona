import { ArmyData, ArmyUtils } from '@/utils/army/army.utils';
import { MiniAttackStrategyResponseDto } from '@/mini-attack-strategies/dto';
import { Logger } from '@nestjs/common';

export interface CalculateMaxPossibleAttacksDependencies {
    armyData: ArmyData;
    attackStrategy: MiniAttackStrategyResponseDto;
    logger: Logger;
}

/**
 * Oblicza maksymalną liczbę możliwych ataków na podstawie strategii i wojska
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Maksymalna liczba możliwych ataków
 */
export function calculateMaxPossibleAttacksOperation(
    deps: CalculateMaxPossibleAttacksDependencies
): number {
    const { armyData, attackStrategy, logger } = deps;

    let maxPossibleAttacks = 0;

    if (attackStrategy.spear > 0 && attackStrategy.sword > 0) {
        const spearUnit = armyData.units.find(u => u.dataUnit === 'spear');
        const swordUnit = armyData.units.find(u => u.dataUnit === 'sword');
        const maxAttacksFromSpear = spearUnit ? Math.floor(spearUnit.inVillage / attackStrategy.spear) : 0;
        const maxAttacksFromSword = swordUnit ? Math.floor(swordUnit.inVillage / attackStrategy.sword) : 0;
        maxPossibleAttacks = Math.min(maxAttacksFromSpear, maxAttacksFromSword);

        logger.log(`Strategy calculation: spear ${spearUnit?.inVillage || 0}/${attackStrategy.spear}=${maxAttacksFromSpear}, sword ${swordUnit?.inVillage || 0}/${attackStrategy.sword}=${maxAttacksFromSword} → ${maxPossibleAttacks} attacks`);
    } else if (attackStrategy.light > 0) {
        const lightUnit = armyData.units.find(u => u.dataUnit === 'light');
        maxPossibleAttacks = lightUnit ? Math.floor(lightUnit.inVillage / attackStrategy.light) : 0;
        logger.log(`Strategy calculation: light ${lightUnit?.inVillage || 0}/${attackStrategy.light} → ${maxPossibleAttacks} attacks`);
    } else {
        logger.warn(`Strategy has unsupported units, falling back to default calculation`);
        const lightUnit = armyData.units.find(u => u.dataUnit === 'light');
        maxPossibleAttacks = lightUnit ? Math.floor(lightUnit.inVillage / 2) : 0;
    }

    return maxPossibleAttacks;
}

