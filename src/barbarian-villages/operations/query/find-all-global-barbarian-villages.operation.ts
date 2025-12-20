import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface FindAllGlobalBarbarianVillagesDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Pobiera wszystkie wioski barbarzyńskie globalnie z opcjonalnym filtrem canAttack
 * @param canAttack Opcjonalny filtr po fladze canAttack
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica wiosek barbarzyńskich
 */
export async function findAllGlobalBarbarianVillagesOperation(
    canAttack: boolean | undefined,
    deps: FindAllGlobalBarbarianVillagesDependencies
): Promise<BarbarianVillageEntity[]> {
    const { barbarianVillageRepository, logger } = deps;

    if (typeof canAttack === 'boolean') {
        logger.debug(`Finding all barbarian villages with canAttack=${canAttack}`);
        return await barbarianVillageRepository.find({
            where: { canAttack },
            order: { createdAt: 'DESC' }
        });
    }

    logger.debug('Finding all barbarian villages without canAttack filter');
    return await barbarianVillageRepository.find({
        order: { createdAt: 'DESC' }
    });
}















