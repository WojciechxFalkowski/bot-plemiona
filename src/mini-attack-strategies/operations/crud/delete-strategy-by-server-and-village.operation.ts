import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';

export interface DeleteStrategyByServerAndVillageDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Usuwa strategię (pierwszą znalezioną dla serverId/villageId)
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function deleteStrategyByServerAndVillageOperation(
    serverId: number,
    villageId: string,
    deps: DeleteStrategyByServerAndVillageDependencies
): Promise<void> {
    const { strategiesRepo, logger } = deps;

    logger.log(`Deleting strategy for server ${serverId}, village ${villageId}`);

    const strategy = await strategiesRepo.findOne({
        where: { serverId, villageId },
        order: { id: 'ASC' }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
    }

    await strategiesRepo.remove(strategy);
    logger.log(`Strategy deleted successfully for server ${serverId}, village ${villageId}`);
}

