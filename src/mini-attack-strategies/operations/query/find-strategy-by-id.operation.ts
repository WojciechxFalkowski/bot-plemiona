import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { MiniAttackStrategyResponseDto } from '../../dto/mini-attack-strategy-response.dto';
import { mapStrategyToResponseDtoOperation } from '../utilities/map-strategy-to-response-dto.operation';

export interface FindStrategyByIdDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Pobiera strategię po ID
 * @param id ID strategii
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO strategii
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function findStrategyByIdOperation(
    id: number,
    deps: FindStrategyByIdDependencies
): Promise<MiniAttackStrategyResponseDto> {
    const { strategiesRepo, logger } = deps;

    logger.debug(`Finding strategy by ID ${id}`);

    const strategy = await strategiesRepo.findOne({
        where: { id }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found with ID ${id}`);
    }

    return mapStrategyToResponseDtoOperation(strategy);
}