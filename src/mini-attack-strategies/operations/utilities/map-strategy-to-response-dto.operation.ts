import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { MiniAttackStrategyResponseDto } from '../../dto/mini-attack-strategy-response.dto';

export interface MapStrategyToResponseDtoDependencies {
    // No dependencies needed - pure function
}

/**
 * Mapuje encję strategii na DTO odpowiedzi
 * @param strategy Encja strategii
 * @param deps Zależności potrzebne do wykonania operacji (obecnie nie używane)
 * @returns DTO strategii
 */
export function mapStrategyToResponseDtoOperation(
    strategy: MiniAttackStrategyEntity,
    deps?: MapStrategyToResponseDtoDependencies
): MiniAttackStrategyResponseDto {
    return {
        id: strategy.id,
        serverId: strategy.serverId,
        villageId: strategy.villageId,
        spear: strategy.spear,
        sword: strategy.sword,
        axe: strategy.axe,
        archer: strategy.archer,
        spy: strategy.spy,
        light: strategy.light,
        marcher: strategy.marcher,
        heavy: strategy.heavy,
        ram: strategy.ram,
        catapult: strategy.catapult,
        knight: strategy.knight,
        snob: strategy.snob,
        next_target_index: strategy.next_target_index,
        is_active: strategy.is_active,
        createdAt: strategy.createdAt,
        updatedAt: strategy.updatedAt
    };
}




