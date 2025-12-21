import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { CreateMiniAttackStrategyDto } from '../../dto/create-mini-attack-strategy.dto';
import { MiniAttackStrategyResponseDto } from '../../dto/mini-attack-strategy-response.dto';
import { mapStrategyToResponseDtoOperation } from '../utilities/map-strategy-to-response-dto.operation';

export interface CreateStrategyDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Tworzy nową strategię
 * @param createDto DTO z danymi strategii
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO utworzonej strategii
 */
export async function createStrategyOperation(
    createDto: CreateMiniAttackStrategyDto,
    deps: CreateStrategyDependencies
): Promise<MiniAttackStrategyResponseDto> {
    const { strategiesRepo, logger } = deps;

    logger.log(`Creating strategy for server ${createDto.serverId}, village ${createDto.villageId}`);

    const strategy = strategiesRepo.create({
        serverId: createDto.serverId,
        villageId: createDto.villageId,
        spear: createDto.spear ?? 0,
        sword: createDto.sword ?? 0,
        axe: createDto.axe ?? 0,
        archer: createDto.archer ?? 0,
        spy: createDto.spy ?? 0,
        light: createDto.light ?? 0,
        marcher: createDto.marcher ?? 0,
        heavy: createDto.heavy ?? 0,
        ram: createDto.ram ?? 0,
        catapult: createDto.catapult ?? 0,
        knight: createDto.knight ?? 0,
        snob: createDto.snob ?? 0,
        next_target_index: createDto.next_target_index ?? 0,
        is_active: createDto.is_active ?? true
    });

    const savedStrategy = await strategiesRepo.save(strategy);
    logger.log(`Strategy created successfully with ID ${savedStrategy.id} for server ${createDto.serverId}, village ${createDto.villageId}`);

    return mapStrategyToResponseDtoOperation(savedStrategy);
}