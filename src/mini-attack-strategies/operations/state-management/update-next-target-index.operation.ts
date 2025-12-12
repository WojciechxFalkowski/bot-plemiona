import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';

export interface UpdateNextTargetIndexDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Aktualizuje indeks następnego celu do ataku dla strategii
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param nextTargetIndex Nowy indeks następnego celu
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function updateNextTargetIndexOperation(
    serverId: number,
    villageId: string,
    nextTargetIndex: number,
    deps: UpdateNextTargetIndexDependencies
): Promise<void> {
    const { strategiesRepo, logger } = deps;

    logger.debug(`Updating next target index to ${nextTargetIndex} for server ${serverId}, village ${villageId}`);

    const strategy = await strategiesRepo.findOne({
        where: { serverId, villageId },
        order: { id: 'ASC' }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
    }

    strategy.next_target_index = nextTargetIndex;
    await strategiesRepo.save(strategy);

    logger.debug(`Next target index updated to ${nextTargetIndex} for server ${serverId}, village ${villageId}`);
}

