import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';

export interface DeleteAllStrategiesByServerAndVillageDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Usuwa wszystkie strategie dla konkretnego serwera i wioski
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws NotFoundException jeśli brak strategii do usunięcia
 */
export async function deleteAllStrategiesByServerAndVillageOperation(
    serverId: number,
    villageId: string,
    deps: DeleteAllStrategiesByServerAndVillageDependencies
): Promise<void> {
    const { strategiesRepo, logger } = deps;

    logger.log(`Deleting all strategies for server ${serverId}, village ${villageId}`);

    const strategies = await strategiesRepo.find({
        where: { serverId, villageId }
    });

    if (strategies.length === 0) {
        throw new NotFoundException(`No strategies found for server ${serverId}, village ${villageId}`);
    }

    await strategiesRepo.remove(strategies);
    logger.log(`Deleted ${strategies.length} strategies for server ${serverId}, village ${villageId}`);
}




