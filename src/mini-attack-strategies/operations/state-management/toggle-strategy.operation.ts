import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';

export interface ToggleStrategyDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Włącza/wyłącza strategię
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param isActive Nowy stan aktywności strategii
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function toggleStrategyOperation(
    serverId: number,
    villageId: string,
    isActive: boolean,
    deps: ToggleStrategyDependencies
): Promise<void> {
    const { strategiesRepo, logger } = deps;

    logger.debug(`Toggling strategy to ${isActive ? 'active' : 'inactive'} for server ${serverId}, village ${villageId}`);

    const strategy = await strategiesRepo.findOne({
        where: { serverId, villageId },
        order: { id: 'ASC' }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
    }

    strategy.is_active = isActive;
    await strategiesRepo.save(strategy);

    logger.debug(`Strategy toggled to ${isActive ? 'active' : 'inactive'} for server ${serverId}, village ${villageId}`);
}

