import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';

export interface DeleteStrategyByIdDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Usuwa strategię po ID
 * @param id ID strategii
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function deleteStrategyByIdOperation(
    id: number,
    deps: DeleteStrategyByIdDependencies
): Promise<void> {
    const { strategiesRepo, logger } = deps;

    logger.log(`Deleting strategy with ID ${id}`);

    const strategy = await strategiesRepo.findOne({
        where: { id }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found with ID ${id}`);
    }

    await strategiesRepo.remove(strategy);
    logger.log(`Strategy deleted successfully with ID ${id}`);
}